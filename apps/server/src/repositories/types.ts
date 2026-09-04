import type {
  Project,
  AgentEntity,
  Workspace,
  Task,
  TaskDependency,
  AgentAssignment,
  Review,
  ReviewFinding,
  Approval,
  Meeting,
  CollaborationRequest,
  EventRecord,
  AuditLog,
  Artifact
} from "@office/shared";

// ==========================================
// Errors
// ==========================================

export class ConcurrencyConflictError extends Error {
  constructor(
    public readonly entityName: string,
    public readonly id: string,
    public readonly expectedRevision: number,
    public readonly actualRevision: number
  ) {
    super(
      `Concurrency conflict on ${entityName} '${id}': expected revision ${expectedRevision}, but found ${actualRevision}`
    );
    this.name = "ConcurrencyConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(public readonly entityName: string, public readonly id: string) {
    super(`${entityName} '${id}' was not found`);
    this.name = "NotFoundError";
  }
}

// ==========================================
// Repository Interfaces
// ==========================================

export interface ProjectRepository {
  create(project: Omit<Project, "revision">): Project;
  findById(id: string): Project | null;
  findByPath(localPath: string): Project | null;
  findAll(): Project[];
  update(id: string, updates: Partial<Project>, expectedRevision?: number): Project;
  delete(id: string): boolean;
}

export interface AgentRepository {
  create(agent: Omit<AgentEntity, "revision">): AgentEntity;
  findById(id: string): AgentEntity | null;
  findAll(): AgentEntity[];
  update(id: string, updates: Partial<AgentEntity>, expectedRevision?: number): AgentEntity;
  delete(id: string): boolean;
}

export interface WorkspaceRepository {
  create(workspace: Omit<Workspace, "revision">): Workspace;
  findById(id: string): Workspace | null;
  findByPath(path: string): Workspace | null;
  findByProjectId(projectId: string): Workspace[];
  findAll(): Workspace[];
  update(id: string, updates: Partial<Workspace>, expectedRevision?: number): Workspace;
  delete(id: string): boolean;
}

export interface TaskRepository {
  create(task: Omit<Task, "revision">): Task;
  findById(id: string): Task | null;
  findByProjectId(projectId: string): Task[];
  findByAssigneeId(assigneeId: string): Task[];
  findAll(): Task[];
  update(id: string, updates: Partial<Task>, expectedRevision?: number): Task;
  delete(id: string): boolean;
  addDependency(taskId: string, dependsOnTaskId: string, type?: "BLOCKS" | "RELATES_TO"): void;
  getDependencies(taskId: string): TaskDependency[];
  getDependents(taskId: string): TaskDependency[];
}

export interface AssignmentRepository {
  create(assignment: Omit<AgentAssignment, "revision">): AgentAssignment;
  findById(id: string): AgentAssignment | null;
  findByTaskId(taskId: string): AgentAssignment[];
  findByAgentId(agentId: string): AgentAssignment[];
  findActiveByTaskId(taskId: string): AgentAssignment | null;
  update(id: string, updates: Partial<AgentAssignment>, expectedRevision?: number): AgentAssignment;
}

export interface ReviewRepository {
  createReview(review: Review): Review;
  findReviewById(id: string): Review | null;
  findReviewsByTaskId(taskId: string): Review[];
  updateReview(id: string, updates: Partial<Review>): Review;
  addFinding(finding: ReviewFinding): ReviewFinding;
  findFindingsByReviewId(reviewId: string): ReviewFinding[];
  updateFinding(id: string, updates: Partial<ReviewFinding>): ReviewFinding;
}

export interface ApprovalRepository {
  create(approval: Omit<Approval, "revision">): Approval;
  findById(id: string): Approval | null;
  findByIdempotencyKey(key: string): Approval | null;
  findByTargetId(targetId: string): Approval[];
  findPending(): Approval[];
  findAll(): Approval[];
  update(id: string, updates: Partial<Approval>, expectedRevision?: number): Approval;
}

export interface MeetingRepository {
  create(meeting: Omit<Meeting, "revision">): Meeting;
  findById(id: string): Meeting | null;
  findByProjectId(projectId: string): Meeting[];
  findAll(): Meeting[];
  update(id: string, updates: Partial<Meeting>, expectedRevision?: number): Meeting;
}

export interface CollaborationRepository {
  create(request: CollaborationRequest): CollaborationRequest;
  findById(id: string): CollaborationRequest | null;
  findByTaskId(taskId: string): CollaborationRequest[];
  findByRecipientId(recipientId: string): CollaborationRequest[];
  update(id: string, updates: Partial<CollaborationRequest>): CollaborationRequest;
}

export interface EventRepository {
  append(event: Omit<EventRecord, "id" | "sequenceNumber">): EventRecord;
  getByStreamId(streamId: string, afterSequence?: number): EventRecord[];
  getByCorrelationId(correlationId: string): EventRecord[];
  getLatest(limit?: number): EventRecord[];
}

export interface AuditRepository {
  append(entry: AuditLog): void;
  findByEntity(entityType: string, entityId: string): AuditLog[];
  findLatest(limit?: number): AuditLog[];
}

export interface ArtifactRepository {
  create(artifact: Artifact): Artifact;
  findById(id: string): Artifact | null;
  findByTaskId(taskId: string): Artifact[];
  findByProjectId(projectId: string): Artifact[];
}
