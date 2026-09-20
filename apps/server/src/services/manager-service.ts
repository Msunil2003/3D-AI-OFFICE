import { randomUUID } from "crypto";
import {
  StructuredPlan,
  StructuredPlanSchema,
  Approval,
  Task,
  AgentAssignment,
  Artifact
} from "@office/shared";
import {
  ArtifactRepository,
  ApprovalRepository,
  ProjectRepository,
  TaskRepository,
  AgentRepository,
  AssignmentRepository,
  EventRepository,
  AuditRepository,
  NotFoundError
} from "../repositories/index";
import { PlanningService, CreatePlanRequest } from "./planning-service";
import { TaskService } from "./task-service";
import { AssignmentService } from "./assignment-service";
import { AgentCandidateScorer, CandidateScore } from "./agent-scorer";
import { ProgressMonitor, ProjectProgressReport } from "./progress-monitor";

export interface ApprovePlanOptions {
  approverId?: string;
  expectedRevision?: number;
  autoAssign?: boolean;
}

export interface RejectPlanOptions {
  approverId?: string;
  reason?: string;
  expectedRevision?: number;
}

export interface PlanDetailsResult {
  plan: StructuredPlan;
  approval?: Approval;
  artifact: Artifact;
  candidateRecommendations: Record<string, CandidateScore[]>;
}

export class ManagerService {
  constructor(
    private planningService: PlanningService,
    private taskService: TaskService,
    private assignmentService: AssignmentService,
    private agentScorer: AgentCandidateScorer,
    private progressMonitor: ProgressMonitor,
    private projectRepo: ProjectRepository,
    private taskRepo: TaskRepository,
    private agentRepo: AgentRepository,
    private approvalRepo: ApprovalRepository,
    private artifactRepo: ArtifactRepository,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Submit high-level request -> returns structured plan and pending approval gate.
   */
  public async createPlan(request: CreatePlanRequest): Promise<{ plan: StructuredPlan; approval: Approval; artifact: Artifact }> {
    return this.planningService.createPlan(request);
  }

  /**
   * Get plan details along with recommended agent candidate scores.
   */
  public getPlan(planId: string): PlanDetailsResult {
    const artifact = this.artifactRepo.findById(planId);
    if (!artifact || artifact.type !== "PLAN") {
      throw new NotFoundError("Plan", planId);
    }

    const plan = StructuredPlanSchema.parse(artifact.metadata);
    const approvals = this.approvalRepo.findByTargetId(planId);
    const approval = approvals[0];

    const allAgents = this.agentRepo.findAll();
    const activeTasks = this.taskRepo.findByProjectId(plan.projectId);
    const candidateRecommendations: Record<string, CandidateScore[]> = {};

    for (const taskPlan of plan.tasks) {
      const dummyTask: Task = {
        id: taskPlan.tempId,
        projectId: plan.projectId,
        title: taskPlan.title,
        description: taskPlan.description,
        type: taskPlan.type,
        priority: taskPlan.priority,
        status: "READY",
        blocked: false,
        acceptanceCriteria: taskPlan.acceptanceCriteria,
        testCriteria: [],
        risk: taskPlan.riskLevel,
        complexity: taskPlan.estimatedComplexity,
        revision: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      candidateRecommendations[taskPlan.tempId] = this.agentScorer.scoreCandidates(
        dummyTask,
        allAgents,
        activeTasks
      );
    }

    return {
      plan,
      approval,
      artifact,
      candidateRecommendations
    };
  }

  /**
   * Human Plan Approval Gate: Approves the plan, decomposes it into real tasks,
   * establishes DAG dependencies, and assigns agents / creates isolated worktrees.
   */
  public async approvePlan(
    planId: string,
    options?: ApprovePlanOptions
  ): Promise<{
    approved: boolean;
    tasks: Task[];
    assignments: AgentAssignment[];
    approval: Approval;
  }> {
    const artifact = this.artifactRepo.findById(planId);
    if (!artifact || artifact.type !== "PLAN") {
      throw new NotFoundError("Plan", planId);
    }

    const plan = StructuredPlanSchema.parse(artifact.metadata);
    const approvals = this.approvalRepo.findByTargetId(planId);
    const approval = approvals[0];
    if (!approval) {
      throw new NotFoundError("Approval for plan", planId);
    }

    // Idempotency: if already approved, return without duplicating tasks
    if (approval.status === "APPROVED") {
      const existingTasks = this.taskRepo.findByProjectId(plan.projectId);
      return {
        approved: true,
        tasks: existingTasks,
        assignments: [],
        approval
      };
    }

    if (approval.status !== "PENDING") {
      throw new Error(`Cannot approve plan with approval status: "${approval.status}"`);
    }

    // Update approval status to APPROVED
    const updatedApproval = this.approvalRepo.update(
      approval.id,
      {
        status: "APPROVED",
        approverId: options?.approverId || "human-user",
        decidedAt: new Date().toISOString()
      },
      options?.expectedRevision ?? approval.revision
    );

    // Decompose plan into tasks
    const tempToRealId = new Map<string, string>();
    const createdTasks: Task[] = [];
    const allAgents = this.agentRepo.findAll();

    // 1. Create task entities
    for (const t of plan.tasks) {
      const task = this.taskService.createTask({
        projectId: plan.projectId,
        title: t.title,
        description: t.description,
        type: t.type,
        priority: t.priority,
        acceptanceCriteria: t.acceptanceCriteria,
        complexity: t.estimatedComplexity,
        risk: t.riskLevel
      });
      tempToRealId.set(t.tempId, task.id);
      createdTasks.push(task);
    }

    // 2. Wire dependencies between real tasks
    for (const t of plan.tasks) {
      const realTaskId = tempToRealId.get(t.tempId)!;
      for (const depTempId of t.dependencies) {
        const realDepId = tempToRealId.get(depTempId);
        if (realDepId) {
          this.taskRepo.addDependency(realTaskId, realDepId, "BLOCKS");
        }
      }
    }

    // 3. Assign agents and provision worktrees if autoAssign is true
    const autoAssign = options?.autoAssign ?? true;
    const assignments: AgentAssignment[] = [];

    if (autoAssign) {
      const activeTasks = this.taskRepo.findByProjectId(plan.projectId);
      for (const t of plan.tasks) {
        const realTaskId = tempToRealId.get(t.tempId)!;
        const realTask = createdTasks.find((ct) => ct.id === realTaskId)!;
        const scores = this.agentScorer.scoreCandidates(realTask, allAgents, activeTasks);

        if (scores.length > 0) {
          const topCandidate = scores[0];
          try {
            const assignResult = await this.assignmentService.assignTask({
              taskId: realTaskId,
              agentId: topCandidate.agent.id,
              assignedBy: "manager"
            });
            assignments.push(assignResult.assignment);
          } catch (err) {
            console.warn(`[ManagerService] Could not auto-assign task ${realTaskId}:`, err);
          }
        }
      }
    }

    // 4. Record event & audit
    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: plan.id,
      correlationId: plan.id,
      producer: "manager-service",
      schemaVersion: "1.0",
      type: "plan.approved",
      payload: {
        planId: plan.id,
        approvalId: updatedApproval.id,
        taskCount: createdTasks.length,
        assignmentCount: assignments.length
      },
      timestamp: new Date().toISOString()
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "plan.approved",
      actorId: options?.approverId || "human-user",
      entityType: "APPROVAL",
      entityId: updatedApproval.id,
      details: {
        planId: plan.id,
        createdTaskIds: createdTasks.map((t) => t.id),
        assignedAgentIds: assignments.map((a) => a.agentId)
      },
      timestamp: new Date().toISOString()
    });

    return {
      approved: true,
      tasks: createdTasks,
      assignments,
      approval: updatedApproval
    };
  }

  /**
   * Reject a plan. Prevents task creation and records rejection.
   */
  public rejectPlan(
    planId: string,
    options?: RejectPlanOptions
  ): { rejected: boolean; approval: Approval } {
    const artifact = this.artifactRepo.findById(planId);
    if (!artifact || artifact.type !== "PLAN") {
      throw new NotFoundError("Plan", planId);
    }

    const approvals = this.approvalRepo.findByTargetId(planId);
    const approval = approvals[0];
    if (!approval) {
      throw new NotFoundError("Approval for plan", planId);
    }

    const updatedApproval = this.approvalRepo.update(
      approval.id,
      {
        status: "REJECTED",
        approverId: options?.approverId || "human-user",
        decisionNotes: options?.reason || "Rejected by user",
        decidedAt: new Date().toISOString()
      },
      options?.expectedRevision ?? approval.revision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: planId,
      correlationId: planId,
      producer: "manager-service",
      schemaVersion: "1.0",
      type: "plan.rejected",
      payload: {
        planId,
        approvalId: updatedApproval.id,
        reason: options?.reason
      },
      timestamp: new Date().toISOString()
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "plan.rejected",
      actorId: options?.approverId || "human-user",
      entityType: "APPROVAL",
      entityId: updatedApproval.id,
      details: {
        planId,
        reason: options?.reason
      },
      timestamp: new Date().toISOString()
    });

    return {
      rejected: true,
      approval: updatedApproval
    };
  }

  /**
   * Get progress report for project.
   */
  public getProgressReport(projectId: string): ProjectProgressReport {
    return this.progressMonitor.getProjectProgress(projectId);
  }
}
