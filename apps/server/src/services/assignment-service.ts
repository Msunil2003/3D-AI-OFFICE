import { randomUUID } from "crypto";
import type { AgentAssignment, AgentEntity, Task, Workspace } from "@office/shared";
import {
  AgentRepository,
  AssignmentRepository,
  AuditRepository,
  EventRepository,
  NotFoundError,
  TaskRepository
} from "../repositories";
import { AgentCandidateScorer, CandidateScore } from "./agent-scorer";
import { WorkspaceManager } from "./workspace-manager";

export interface AssignTaskParams {
  taskId: string;
  agentId?: string;
  assignedBy?: string;
  expectedTaskRevision?: number;
}

export interface ReassignTaskParams {
  taskId: string;
  newAgentId: string;
  reason?: string;
  assignedBy?: string;
  expectedTaskRevision?: number;
}

export interface AssignmentResult {
  task: Task;
  assignment: AgentAssignment;
  workspace: Workspace;
  agent: AgentEntity;
  candidateScores?: CandidateScore[];
}

export class AssignmentService {
  private scorer = new AgentCandidateScorer();

  constructor(
    private taskRepo: TaskRepository,
    private agentRepo: AgentRepository,
    private assignmentRepo: AssignmentRepository,
    private workspaceManager: WorkspaceManager,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Assigns an agent to a task, automatically creating an isolated workspace & worktree.
   */
  public async assignTask(params: AssignTaskParams): Promise<AssignmentResult> {
    const task = this.taskRepo.findById(params.taskId);
    if (!task) {
      throw new NotFoundError("Task", params.taskId);
    }

    if (task.status !== "READY" && task.status !== "ASSIGNED") {
      throw new Error(`Cannot assign task '${task.id}' in status '${task.status}'. Must be READY or ASSIGNED.`);
    }

    let targetAgent: AgentEntity | null = null;
    let candidateScores: CandidateScore[] | undefined;

    if (params.agentId) {
      targetAgent = this.agentRepo.findById(params.agentId);
      if (!targetAgent) {
        throw new NotFoundError("Agent", params.agentId);
      }
    } else {
      // Deterministically score candidates
      const allAgents = this.agentRepo.findAll();
      if (allAgents.length === 0) {
        throw new Error("No agents available in the system for task assignment.");
      }
      const allTasks = this.taskRepo.findAll();
      candidateScores = this.scorer.scoreCandidates(task, allAgents, allTasks);
      targetAgent = candidateScores[0].agent;
    }

    // 1. Create/provision dedicated workspace and git worktree
    const workspace = await this.workspaceManager.createWorkspace({
      projectId: task.projectId,
      taskId: task.id,
      agentId: targetAgent.id,
      agentSlug: targetAgent.name
    });

    // 2. Update task record (with OCC)
    const now = new Date().toISOString();
    const updatedTask = this.taskRepo.update(
      task.id,
      {
        status: "ASSIGNED",
        assigneeId: targetAgent.id,
        workspaceId: workspace.id,
        branch: workspace.branch,
        updatedAt: now
      },
      params.expectedTaskRevision
    );

    // 3. Create explicit AgentAssignment record (with OCC)
    const assignment = this.assignmentRepo.create({
      id: `asgn-${randomUUID().slice(0, 8)}`,
      taskId: task.id,
      agentId: targetAgent.id,
      workspaceId: workspace.id,
      assignedBy: params.assignedBy || "manager",
      status: "ACTIVE",
      reason: candidateScores ? `Top scored candidate (${candidateScores[0].overallScore}pts)` : "Direct assignment",
      assignedAt: now,
      updatedAt: now
    });

    // 4. Update agent status to working
    this.agentRepo.update(targetAgent.id, {
      status: "working",
      summary: `Assigned to: ${task.title}`
    });

    // 5. Emit event
    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: task.id,
      correlationId: task.id,
      producer: "assignment-service",
      schemaVersion: "1.0",
      type: "task.assigned",
      payload: {
        taskId: task.id,
        agentId: targetAgent.id,
        workspaceId: workspace.id,
        branch: workspace.branch,
        assignmentId: assignment.id
      },
      timestamp: now
    });

    // 6. Audit log
    this.auditRepo.append({
      id: randomUUID(),
      action: "task.assigned",
      actorId: params.assignedBy || "manager",
      entityType: "TASK",
      entityId: task.id,
      details: {
        agentId: targetAgent.id,
        assignmentId: assignment.id,
        branch: workspace.branch
      },
      timestamp: now
    });

    return {
      task: updatedTask,
      assignment,
      workspace,
      agent: targetAgent,
      candidateScores
    };
  }

  /**
   * Reassigns an ongoing task to another agent.
   */
  public async reassignTask(params: ReassignTaskParams): Promise<AssignmentResult> {
    const task = this.taskRepo.findById(params.taskId);
    if (!task) {
      throw new NotFoundError("Task", params.taskId);
    }

    const newAgent = this.agentRepo.findById(params.newAgentId);
    if (!newAgent) {
      throw new NotFoundError("Agent", params.newAgentId);
    }

    // 1. Retire previous active assignment
    const activeAssignment = this.assignmentRepo.findActiveByTaskId(task.id);
    const now = new Date().toISOString();
    if (activeAssignment) {
      this.assignmentRepo.update(activeAssignment.id, {
        status: "REASSIGNED",
        reason: params.reason || "Reassigned to another agent",
        completedAt: now,
        updatedAt: now
      });

      // Free previous agent if no other active tasks
      this.agentRepo.update(activeAssignment.agentId, {
        status: "available",
        summary: "Ready"
      });
    }

    // 2. Provision/rebind workspace
    const workspace = await this.workspaceManager.createWorkspace({
      projectId: task.projectId,
      taskId: task.id,
      agentId: newAgent.id,
      agentSlug: newAgent.name
    });

    // 3. Update task (with OCC)
    const updatedTask = this.taskRepo.update(
      task.id,
      {
        assigneeId: newAgent.id,
        workspaceId: workspace.id,
        branch: workspace.branch,
        updatedAt: now
      },
      params.expectedTaskRevision
    );

    // 4. Create new AgentAssignment
    const assignment = this.assignmentRepo.create({
      id: `asgn-${randomUUID().slice(0, 8)}`,
      taskId: task.id,
      agentId: newAgent.id,
      workspaceId: workspace.id,
      assignedBy: params.assignedBy || "manager",
      status: "ACTIVE",
      reason: params.reason || "Handoff reassignment",
      assignedAt: now,
      updatedAt: now
    });

    // 5. Update new agent status
    this.agentRepo.update(newAgent.id, {
      status: "working",
      summary: `Reassigned to: ${task.title}`
    });

    // 6. Audit & event
    this.auditRepo.append({
      id: randomUUID(),
      action: "task.reassigned",
      actorId: params.assignedBy || "manager",
      entityType: "TASK",
      entityId: task.id,
      details: {
        previousAgentId: activeAssignment?.agentId,
        newAgentId: newAgent.id,
        reason: params.reason
      },
      timestamp: now
    });

    return {
      task: updatedTask,
      assignment,
      workspace,
      agent: newAgent
    };
  }

  /**
   * Completes an active assignment when the task reaches a finished or terminal state.
   */
  public completeAssignment(taskId: string): void {
    const activeAssignment = this.assignmentRepo.findActiveByTaskId(taskId);
    if (activeAssignment) {
      const now = new Date().toISOString();
      this.assignmentRepo.update(activeAssignment.id, {
        status: "COMPLETED",
        completedAt: now,
        updatedAt: now
      });

      this.agentRepo.update(activeAssignment.agentId, {
        status: "available",
        summary: "Ready"
      });
    }
  }
}
