import { randomUUID } from "crypto";
import type { Task, TaskPriority, TaskStatus, TaskType } from "@office/shared";
import {
  AuditRepository,
  ConcurrencyConflictError,
  EventRepository,
  NotFoundError,
  TaskRepository
} from "../repositories";

export interface CreateTaskParams {
  id?: string;
  projectId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  acceptanceCriteria?: string[];
  testCriteria?: string[];
  risk?: "LOW" | "MEDIUM" | "HIGH";
  complexity?: number;
  dependencies?: string[];
}

export class TaskService {
  // Valid transitions map: current state -> set of allowed next states
  private static readonly VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    READY: ["ASSIGNED", "CANCELLED"],
    ASSIGNED: ["IN_PROGRESS", "READY", "CANCELLED"],
    IN_PROGRESS: ["TESTING", "READY_FOR_REVIEW", "CANCELLED"],
    TESTING: ["READY_FOR_REVIEW", "IN_PROGRESS", "CANCELLED"],
    READY_FOR_REVIEW: ["IN_REVIEW", "IN_PROGRESS", "CANCELLED"],
    IN_REVIEW: ["APPROVAL", "IN_PROGRESS", "TESTING", "CANCELLED"],
    APPROVAL: ["READY_FOR_MERGE", "IN_PROGRESS", "CANCELLED"],
    READY_FOR_MERGE: ["DONE", "IN_PROGRESS", "CANCELLED"],
    DONE: [], // Terminal
    CANCELLED: [] // Terminal
  };

  constructor(
    private taskRepo: TaskRepository,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  public createTask(params: CreateTaskParams): Task {
    const taskId = params.id || `task-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const task = this.taskRepo.create({
      id: taskId,
      projectId: params.projectId,
      parentTaskId: params.parentTaskId,
      title: params.title,
      description: params.description,
      type: params.type || "FEATURE",
      priority: params.priority || "MEDIUM",
      status: "READY",
      blocked: false,
      acceptanceCriteria: params.acceptanceCriteria || [],
      testCriteria: params.testCriteria || [],
      risk: params.risk || "LOW",
      complexity: params.complexity ?? 3,
      createdAt: now,
      updatedAt: now
    });

    if (params.dependencies && params.dependencies.length > 0) {
      for (const depId of params.dependencies) {
        this.taskRepo.addDependency(task.id, depId, "BLOCKS");
      }
    }

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: task.id,
      correlationId: task.id,
      producer: "task-service",
      schemaVersion: "1.0",
      type: "task.created",
      payload: { taskId: task.id, projectId: task.projectId, title: task.title },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "task.created",
      actorId: "system",
      entityType: "TASK",
      entityId: task.id,
      details: { title: task.title, type: task.type, priority: task.priority },
      timestamp: now
    });

    return task;
  }

  public getTask(taskId: string): Task {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundError("Task", taskId);
    }
    return task;
  }

  public getTasksByProject(projectId: string): Task[] {
    return this.taskRepo.findByProjectId(projectId);
  }

  /**
   * Advances the task state machine with transition and dependency validation.
   */
  public transitionTask(taskId: string, nextStatus: TaskStatus, expectedRevision?: number): Task {
    const task = this.getTask(taskId);
    const currentStatus = task.status;

    // Check if transition is allowed
    const allowed = TaskService.VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(
        `Invalid task state transition from '${currentStatus}' to '${nextStatus}'. Allowed transitions: ${allowed.join(", ") || "none (terminal state)"}`
      );
    }

    // Dependency DAG guard: cannot enter IN_PROGRESS if any prerequisite is not DONE
    if (nextStatus === "IN_PROGRESS") {
      const dependencies = this.taskRepo.getDependencies(taskId);
      const blockingDeps = dependencies.filter((d) => d.type === "BLOCKS");

      for (const dep of blockingDeps) {
        const depTask = this.taskRepo.findById(dep.dependsOnTaskId);
        if (!depTask || depTask.status !== "DONE") {
          throw new Error(
            `Cannot start task '${taskId}': blocked by prerequisite task '${dep.dependsOnTaskId}' which is in state '${depTask?.status ?? "MISSING"}'`
          );
        }
      }
    }

    const now = new Date().toISOString();
    const startedAt = nextStatus === "IN_PROGRESS" && !task.startedAt ? now : task.startedAt;
    const completedAt = nextStatus === "DONE" ? now : task.completedAt;

    const updated = this.taskRepo.update(
      taskId,
      {
        status: nextStatus,
        startedAt,
        completedAt,
        updatedAt: now
      },
      expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: taskId,
      correlationId: taskId,
      producer: "task-service",
      schemaVersion: "1.0",
      type: "task.transitioned",
      payload: { taskId, prevStatus: currentStatus, nextStatus },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "task.transitioned",
      actorId: "system",
      entityType: "TASK",
      entityId: taskId,
      details: { prevStatus: currentStatus, nextStatus },
      timestamp: now
    });

    return updated;
  }

  /**
   * Sets a non-sequential blocked condition on the task without changing its lifecycle stage.
   */
  public setBlocked(
    taskId: string,
    reason: string,
    blockedBy?: string,
    expectedRevision?: number
  ): Task {
    const task = this.getTask(taskId);
    const now = new Date().toISOString();

    const updated = this.taskRepo.update(
      taskId,
      {
        blocked: true,
        blockedReason: reason,
        blockedBy: blockedBy || undefined,
        blockedAt: now,
        updatedAt: now
      },
      expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: taskId,
      correlationId: taskId,
      producer: "task-service",
      schemaVersion: "1.0",
      type: "task.blocked",
      payload: { taskId, reason, blockedBy },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "task.blocked",
      actorId: "system",
      entityType: "TASK",
      entityId: taskId,
      details: { reason, blockedBy },
      timestamp: now
    });

    return updated;
  }

  /**
   * Clears the blocked condition on the task.
   */
  public clearBlocked(taskId: string, expectedRevision?: number): Task {
    const task = this.getTask(taskId);
    const now = new Date().toISOString();

    const updated = this.taskRepo.update(
      taskId,
      {
        blocked: false,
        blockedReason: undefined,
        blockedBy: undefined,
        blockedAt: undefined,
        updatedAt: now
      },
      expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: taskId,
      correlationId: taskId,
      producer: "task-service",
      schemaVersion: "1.0",
      type: "task.unblocked",
      payload: { taskId },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "task.unblocked",
      actorId: "system",
      entityType: "TASK",
      entityId: taskId,
      details: { previousReason: task.blockedReason },
      timestamp: now
    });

    return updated;
  }
}
