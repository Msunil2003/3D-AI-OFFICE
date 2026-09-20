import { Task, TaskStatus, AgentAssignment, AgentEntity } from "@office/shared";
import {
  TaskRepository,
  AssignmentRepository,
  AgentRepository,
  ProjectRepository,
  NotFoundError
} from "../repositories/index";

export interface ProjectProgressReport {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;
  statusCounts: Record<TaskStatus, number>;
  blockedTasks: Array<{
    taskId: string;
    title: string;
    status: TaskStatus;
    blockedReason?: string;
    blockedBy?: string;
  }>;
  activeAssignments: Array<{
    taskId: string;
    taskTitle: string;
    agentId: string;
    agentName: string;
    status: string;
  }>;
  bottlenecks: string[];
}

export class ProgressMonitor {
  constructor(
    private projectRepo: ProjectRepository,
    private taskRepo: TaskRepository,
    private assignmentRepo: AssignmentRepository,
    private agentRepo: AgentRepository
  ) {}

  public getProjectProgress(projectId: string): ProjectProgressReport {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    const tasks = this.taskRepo.findByProjectId(projectId);
    const statusCounts: Record<TaskStatus, number> = {
      READY: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      TESTING: 0,
      READY_FOR_REVIEW: 0,
      IN_REVIEW: 0,
      APPROVAL: 0,
      READY_FOR_MERGE: 0,
      DONE: 0,
      CANCELLED: 0
    };

    const blockedTasks: ProjectProgressReport["blockedTasks"] = [];

    for (const task of tasks) {
      statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
      if (task.blocked) {
        blockedTasks.push({
          taskId: task.id,
          title: task.title,
          status: task.status,
          blockedReason: task.blockedReason,
          blockedBy: task.blockedBy
        });
      }
    }

    const totalTasks = tasks.length;
    const completedTasks = statusCounts.DONE || 0;
    const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Active assignments
    const activeAssignments: ProjectProgressReport["activeAssignments"] = [];
    for (const task of tasks) {
      const assignments = this.assignmentRepo.findByTaskId(task.id);
      const active = assignments.find((a) => a.status === "ACTIVE");
      if (active) {
        const agent = this.agentRepo.findById(active.agentId);
        activeAssignments.push({
          taskId: task.id,
          taskTitle: task.title,
          agentId: active.agentId,
          agentName: agent ? agent.name : active.agentId,
          status: task.status
        });
      }
    }

    // Bottlenecks
    const bottlenecks: string[] = [];
    if (statusCounts.READY_FOR_REVIEW + statusCounts.IN_REVIEW > 3) {
      bottlenecks.push("Review queue congested: multiple tasks awaiting code review");
    }
    if (statusCounts.APPROVAL > 0) {
      bottlenecks.push(`${statusCounts.APPROVAL} task(s) awaiting human approval for merge`);
    }
    if (blockedTasks.length > 0) {
      bottlenecks.push(`${blockedTasks.length} task(s) currently blocked by failures or dependencies`);
    }

    return {
      projectId: project.id,
      projectName: project.name,
      totalTasks,
      completedTasks,
      percentComplete,
      statusCounts,
      blockedTasks,
      activeAssignments,
      bottlenecks
    };
  }
}
