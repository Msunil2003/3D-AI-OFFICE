import { randomUUID } from "crypto";
import {
  CollaborationRequest,
  CollaborationStatus
} from "@office/shared";
import {
  AgentRepository,
  AuditRepository,
  CollaborationRepository,
  EventRepository,
  NotFoundError,
  ProjectRepository,
  TaskRepository
} from "../repositories";

export class CollaborationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollaborationValidationError";
  }
}

export class InvalidCollaborationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCollaborationStateError";
  }
}

export class CollaborationPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollaborationPermissionError";
  }
}

export interface RequestAssistanceParams {
  taskId: string;
  senderId: string;
  recipientId: string;
  reason: string;
  message: string;
}

export interface RespondAssistanceParams {
  actorId: string;
  notes?: string;
  reason?: string;
}

export class CollaborationService {
  constructor(
    private collabRepo: CollaborationRepository,
    private agentRepo: AgentRepository,
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Requests assistance or pairing from a peer agent on a specific task.
   */
  public requestAssistance(params: RequestAssistanceParams): CollaborationRequest {
    if (params.senderId === params.recipientId) {
      throw new CollaborationValidationError("Agent cannot request collaboration from itself");
    }

    const task = this.taskRepo.findById(params.taskId);
    if (!task) {
      throw new NotFoundError("Task", params.taskId);
    }

    const sender = this.agentRepo.findById(params.senderId);
    if (!sender) {
      throw new NotFoundError("Agent (sender)", params.senderId);
    }

    const recipient = this.agentRepo.findById(params.recipientId);
    if (!recipient) {
      throw new NotFoundError("Agent (recipient)", params.recipientId);
    }

    const id = `collab-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const request = this.collabRepo.create({
      id,
      taskId: task.id,
      projectId: task.projectId,
      senderId: params.senderId,
      recipientId: params.recipientId,
      reason: params.reason,
      message: params.message,
      status: "REQUESTED",
      createdAt: now,
      updatedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: task.id,
      correlationId: task.id,
      producer: "collaboration-service",
      schemaVersion: "1.0",
      type: "collaboration.requested",
      payload: {
        collaborationId: request.id,
        taskId: task.id,
        projectId: task.projectId,
        senderId: params.senderId,
        recipientId: params.recipientId,
        reason: params.reason,
        message: params.message
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "collaboration.requested",
      actorId: params.senderId,
      entityType: "TASK",
      entityId: task.id,
      details: {
        collaborationId: request.id,
        recipientId: params.recipientId,
        reason: params.reason
      },
      timestamp: now
    });

    return request;
  }

  /**
   * Accepts a collaboration request. Only the recipient agent (or manager/system) can accept.
   */
  public acceptAssistance(id: string, params: RespondAssistanceParams): CollaborationRequest {
    const request = this.collabRepo.findById(id);
    if (!request) {
      throw new NotFoundError("CollaborationRequest", id);
    }

    if (request.status !== "REQUESTED") {
      throw new InvalidCollaborationStateError(
        `Cannot accept collaboration request '${id}' with status '${request.status}'. Expected 'REQUESTED'.`
      );
    }

    if (params.actorId !== request.recipientId && params.actorId !== "system" && !params.actorId.startsWith("manager")) {
      throw new CollaborationPermissionError(
        `Actor '${params.actorId}' is not authorized to accept collaboration intended for '${request.recipientId}'`
      );
    }

    const now = new Date().toISOString();
    const updated = this.collabRepo.update(id, {
      status: "ACCEPTED",
      updatedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: request.taskId,
      correlationId: request.taskId,
      producer: "collaboration-service",
      schemaVersion: "1.0",
      type: "collaboration.accepted",
      payload: {
        collaborationId: request.id,
        taskId: request.taskId,
        recipientId: request.recipientId,
        notes: params.notes
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "collaboration.accepted",
      actorId: params.actorId,
      entityType: "TASK",
      entityId: request.taskId,
      details: {
        collaborationId: request.id,
        notes: params.notes
      },
      timestamp: now
    });

    return updated;
  }

  /**
   * Declines a collaboration request.
   */
  public declineAssistance(id: string, params: RespondAssistanceParams): CollaborationRequest {
    const request = this.collabRepo.findById(id);
    if (!request) {
      throw new NotFoundError("CollaborationRequest", id);
    }

    if (request.status !== "REQUESTED") {
      throw new InvalidCollaborationStateError(
        `Cannot decline collaboration request '${id}' with status '${request.status}'. Expected 'REQUESTED'.`
      );
    }

    if (params.actorId !== request.recipientId && params.actorId !== "system" && !params.actorId.startsWith("manager")) {
      throw new CollaborationPermissionError(
        `Actor '${params.actorId}' is not authorized to decline collaboration intended for '${request.recipientId}'`
      );
    }

    const now = new Date().toISOString();
    const updated = this.collabRepo.update(id, {
      status: "DECLINED",
      updatedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: request.taskId,
      correlationId: request.taskId,
      producer: "collaboration-service",
      schemaVersion: "1.0",
      type: "collaboration.declined",
      payload: {
        collaborationId: request.id,
        taskId: request.taskId,
        recipientId: request.recipientId,
        reason: params.reason
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "collaboration.declined",
      actorId: params.actorId,
      entityType: "TASK",
      entityId: request.taskId,
      details: {
        collaborationId: request.id,
        reason: params.reason
      },
      timestamp: now
    });

    return updated;
  }

  /**
   * Completes an active collaboration session.
   */
  public completeAssistance(id: string, params: { actorId: string; outcome?: string }): CollaborationRequest {
    const request = this.collabRepo.findById(id);
    if (!request) {
      throw new NotFoundError("CollaborationRequest", id);
    }

    if (request.status !== "ACCEPTED") {
      throw new InvalidCollaborationStateError(
        `Cannot complete collaboration request '${id}' with status '${request.status}'. Expected 'ACCEPTED'.`
      );
    }

    const now = new Date().toISOString();
    const updated = this.collabRepo.update(id, {
      status: "COMPLETED",
      updatedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: request.taskId,
      correlationId: request.taskId,
      producer: "collaboration-service",
      schemaVersion: "1.0",
      type: "collaboration.completed",
      payload: {
        collaborationId: request.id,
        taskId: request.taskId,
        actorId: params.actorId,
        outcome: params.outcome
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "collaboration.completed",
      actorId: params.actorId,
      entityType: "TASK",
      entityId: request.taskId,
      details: {
        collaborationId: request.id,
        outcome: params.outcome
      },
      timestamp: now
    });

    return updated;
  }

  /**
   * Cancels a collaboration request.
   */
  public cancelAssistance(id: string, params: { actorId: string; reason?: string }): CollaborationRequest {
    const request = this.collabRepo.findById(id);
    if (!request) {
      throw new NotFoundError("CollaborationRequest", id);
    }

    if (request.status !== "REQUESTED" && request.status !== "ACCEPTED") {
      throw new InvalidCollaborationStateError(
        `Cannot cancel collaboration request '${id}' with status '${request.status}'.`
      );
    }

    const now = new Date().toISOString();
    const updated = this.collabRepo.update(id, {
      status: "CANCELLED",
      updatedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: request.taskId,
      correlationId: request.taskId,
      producer: "collaboration-service",
      schemaVersion: "1.0",
      type: "collaboration.cancelled",
      payload: {
        collaborationId: request.id,
        taskId: request.taskId,
        actorId: params.actorId,
        reason: params.reason
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "collaboration.cancelled",
      actorId: params.actorId,
      entityType: "TASK",
      entityId: request.taskId,
      details: {
        collaborationId: request.id,
        reason: params.reason
      },
      timestamp: now
    });

    return updated;
  }

  public getRequest(id: string): CollaborationRequest {
    const request = this.collabRepo.findById(id);
    if (!request) {
      throw new NotFoundError("CollaborationRequest", id);
    }
    return request;
  }

  public getRequestsForTask(taskId: string): CollaborationRequest[] {
    return this.collabRepo.findByTaskId(taskId);
  }

  public getRequestsForAgent(agentId: string): CollaborationRequest[] {
    return this.collabRepo.findByRecipientId(agentId);
  }
}
