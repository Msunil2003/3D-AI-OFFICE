import { z } from "zod";

// ==========================================
// 1. Projects
// ==========================================

export const ProjectStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  repositoryUrl: z.string().optional(),
  localPath: z.string().min(1),
  defaultBranch: z.string().min(1).default("main"),
  status: ProjectStatusSchema.default("ACTIVE"),
  settings: z.record(z.unknown()).default({}),
  revision: z.number().int().nonnegative().default(1),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Project = z.infer<typeof ProjectSchema>;

// ==========================================
// 2. Agents & Roles
// ==========================================

export const AgentRoleSchema = z.enum([
  "LEAD",
  "BACKEND",
  "FRONTEND",
  "FULLSTACK",
  "DEVOPS",
  "QA",
  "SECURITY",
  "ARCHITECT"
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentDomainStatusSchema = z.enum([
  "idle",
  "available",
  "thinking",
  "working",
  "replied",
  "error"
]);
export type AgentDomainStatus = z.infer<typeof AgentDomainStatusSchema>;

export const AgentEntitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: AgentRoleSchema.default("FULLSTACK"),
  department: z.string().default("Engineering"),
  skills: z.record(z.number()).default({}),
  status: AgentDomainStatusSchema.default("available"),
  summary: z.string().default("Ready"),
  desk: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  provider: z.string().default("opencode"),
  workingDirectory: z.string().optional(),
  revision: z.number().int().nonnegative().default(1),
  lastSeen: z.string()
});
export type AgentEntity = z.infer<typeof AgentEntitySchema>;

// ==========================================
// 3. Workspaces
// ==========================================

export const WorkspaceStatusSchema = z.enum([
  "CREATING",
  "READY",
  "IN_USE",
  "DIRTY",
  "ARCHIVED",
  "RECOVERY_REQUIRED",
  "FAILED"
]);
export type WorkspaceStatus = z.infer<typeof WorkspaceStatusSchema>;

export const WorkspaceSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  agentId: z.string().optional(),
  path: z.string().min(1),
  branch: z.string().min(1),
  worktreeId: z.string().optional(),
  status: WorkspaceStatusSchema.default("READY"),
  revision: z.number().int().nonnegative().default(1),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

// ==========================================
// 4. Tasks & State Machine
// ==========================================

export const TaskTypeSchema = z.enum([
  "EPIC",
  "FEATURE",
  "BUG",
  "TECHNICAL_TASK",
  "REFACTOR",
  "TEST",
  "SECURITY",
  "PERFORMANCE",
  "RESEARCH",
  "DOCUMENTATION"
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum([
  "READY",
  "ASSIGNED",
  "IN_PROGRESS",
  "TESTING",
  "READY_FOR_REVIEW",
  "IN_REVIEW",
  "APPROVAL",
  "READY_FOR_MERGE",
  "DONE",
  "CANCELLED"
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  parentTaskId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: TaskTypeSchema.default("FEATURE"),
  priority: TaskPrioritySchema.default("MEDIUM"),
  status: TaskStatusSchema.default("READY"),
  blocked: z.boolean().default(false),
  blockedReason: z.string().optional(),
  blockedBy: z.string().optional(),
  blockedAt: z.string().optional(),
  assigneeId: z.string().optional(),
  workspaceId: z.string().optional(),
  branch: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).default([]),
  testCriteria: z.array(z.string()).default([]),
  risk: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  complexity: z.number().int().min(1).max(5).default(3),
  revision: z.number().int().nonnegative().default(1),
  createdAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  updatedAt: z.string()
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskDependencySchema = z.object({
  taskId: z.string().min(1),
  dependsOnTaskId: z.string().min(1),
  type: z.enum(["BLOCKS", "RELATES_TO"]).default("BLOCKS")
});
export type TaskDependency = z.infer<typeof TaskDependencySchema>;

// ==========================================
// 5. Agent Assignments
// ==========================================

export const AssignmentStatusSchema = z.enum([
  "ACTIVE",
  "COMPLETED",
  "REASSIGNED",
  "CANCELLED"
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const AgentAssignmentSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  agentId: z.string().min(1),
  workspaceId: z.string().optional(),
  assignedBy: z.string().default("manager"),
  status: AssignmentStatusSchema.default("ACTIVE"),
  reason: z.string().optional(),
  revision: z.number().int().nonnegative().default(1),
  assignedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional()
});
export type AgentAssignment = z.infer<typeof AgentAssignmentSchema>;

// ==========================================
// 6. Code Reviews & Findings
// ==========================================

export const ReviewStatusSchema = z.enum([
  "IN_PROGRESS",
  "APPROVED",
  "CHANGES_REQUESTED"
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const FindingSeveritySchema = z.enum([
  "INFO",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const ReviewFindingSchema = z.object({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  severity: FindingSeveritySchema.default("MEDIUM"),
  category: z.enum(["SECURITY", "PERFORMANCE", "CORRECTNESS", "STYLE", "TESTS"]).default("CORRECTNESS"),
  file: z.string().min(1),
  line: z.number().int().optional(),
  message: z.string().min(1),
  recommendation: z.string().min(1),
  evidence: z.string().optional(),
  status: z.enum(["PENDING", "RESOLVED"]).default("PENDING"),
  introducedCommit: z.string().optional(),
  resolvedCommit: z.string().optional(),
  resolvedAt: z.string().optional(),
  resolvedBy: z.string().optional(),
  resolution: z.string().optional()
});
export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

export const ReviewSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  reviewerId: z.string().min(1),
  status: ReviewStatusSchema.default("IN_PROGRESS"),
  summary: z.string().optional(),
  commitHash: z.string().min(1),
  diffHash: z.string().min(1),
  findings: z.array(ReviewFindingSchema).default([]),
  createdAt: z.string(),
  completedAt: z.string().optional()
});
export type Review = z.infer<typeof ReviewSchema>;

// ==========================================
// 7. Approvals
// ==========================================

export const ApprovalTypeSchema = z.enum([
  "MERGE",
  "PLAN_EXECUTION",
  "DESTRUCTIVE",
  "DEPLOYMENT"
]);
export type ApprovalType = z.infer<typeof ApprovalTypeSchema>;

export const ApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "STALE"
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalSchema = z.object({
  id: z.string().min(1),
  type: ApprovalTypeSchema,
  targetId: z.string().min(1),
  targetRevision: z.number().int().nonnegative(),
  targetCommit: z.string().min(1),
  targetDiffHash: z.string().min(1),
  status: ApprovalStatusSchema.default("PENDING"),
  requesterId: z.string().min(1),
  approverId: z.string().optional(),
  reason: z.string().min(1),
  risk: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  evidence: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().optional(),
  decisionNotes: z.string().optional(),
  revision: z.number().int().nonnegative().default(1),
  createdAt: z.string(),
  decidedAt: z.string().optional()
});
export type Approval = z.infer<typeof ApprovalSchema>;

// ==========================================
// 8. Meetings
// ==========================================

export const MeetingStatusSchema = z.enum([
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED"
]);
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;

export const MeetingSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().min(1),
  status: MeetingStatusSchema.default("SCHEDULED"),
  participants: z.array(z.string()).default([]),
  agenda: z.array(z.string()).default([]),
  outcomes: z.array(z.string()).default([]),
  revision: z.number().int().nonnegative().default(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional()
});
export type Meeting = z.infer<typeof MeetingSchema>;

// ==========================================
// 9. Collaboration Requests
// ==========================================

export const CollaborationStatusSchema = z.enum([
  "REQUESTED",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "CANCELLED"
]);
export type CollaborationStatus = z.infer<typeof CollaborationStatusSchema>;

export const CollaborationRequestSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  projectId: z.string().min(1),
  senderId: z.string().min(1),
  recipientId: z.string().min(1),
  reason: z.string().min(1),
  message: z.string().min(1),
  status: CollaborationStatusSchema.default("REQUESTED"),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type CollaborationRequest = z.infer<typeof CollaborationRequestSchema>;

// ==========================================
// 10. Strengthened Event Records
// ==========================================

export const EventRecordSchema = z.object({
  id: z.number().int().optional(),
  eventId: z.string().min(1),
  sequenceNumber: z.number().int().nonnegative(),
  streamId: z.string().min(1),
  causationId: z.string().optional(),
  correlationId: z.string().optional(),
  producer: z.string().min(1),
  schemaVersion: z.string().default("1.0"),
  type: z.string().min(1),
  payload: z.record(z.unknown()),
  timestamp: z.string()
});
export type EventRecord = z.infer<typeof EventRecordSchema>;

// ==========================================
// 11. Immutable Audit Log
// ==========================================

export const AuditLogSchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1),
  actorId: z.string().min(1),
  entityType: z.enum(["TASK", "WORKSPACE", "PROJECT", "APPROVAL", "MERGE", "AGENT", "MEETING"]),
  entityId: z.string().min(1),
  details: z.record(z.unknown()),
  idempotencyKey: z.string().optional(),
  timestamp: z.string()
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// ==========================================
// 12. Generic Artifact Model
// ==========================================

export const ArtifactStorageTypeSchema = z.enum([
  "FILE",
  "URI",
  "GIT_COMMIT",
  "DIFF",
  "INLINE_JSON"
]);
export type ArtifactStorageType = z.infer<typeof ArtifactStorageTypeSchema>;

export const ArtifactTypeSchema = z.enum([
  "PLAN",
  "DIFF",
  "BUILD_LOG",
  "TEST_REPORT",
  "REVIEW",
  "ADR",
  "MEETING_NOTES",
  "SCREENSHOT"
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactSchema = z.object({
  id: z.string().min(1),
  type: ArtifactTypeSchema,
  projectId: z.string().min(1),
  taskId: z.string().optional(),
  storageType: ArtifactStorageTypeSchema,
  uri: z.string().min(1),
  contentHash: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
  version: z.number().int().nonnegative().default(1),
  createdAt: z.string()
});
export type Artifact = z.infer<typeof ArtifactSchema>;

// ==========================================
// 13. Structured Manager Planning Models
// ==========================================

export const DecomposedTaskPlanSchema = z.object({
  tempId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  type: TaskTypeSchema.default("FEATURE"),
  priority: TaskPrioritySchema.default("MEDIUM"),
  requiredRole: AgentRoleSchema.default("FULLSTACK"),
  requiredSkills: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  estimatedComplexity: z.number().int().min(1).max(5).default(3),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  acceptanceCriteria: z.array(z.string()).default([])
});
export type DecomposedTaskPlan = z.infer<typeof DecomposedTaskPlanSchema>;

export const StructuredPlanSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  goal: z.string().min(1),
  architecturalSummary: z.string().min(1),
  tasks: z.array(DecomposedTaskPlanSchema).min(1),
  risks: z.array(z.string()).default([]),
  createdAt: z.string()
});
export type StructuredPlan = z.infer<typeof StructuredPlanSchema>;
