import { SqliteDatabase, getDefaultDb } from "../db/database";
import { runMigrations } from "../db/migrations";
import { SqliteProjectRepository } from "./sqlite-project-repo";
import { SqliteAgentRepository } from "./sqlite-agent-repo";
import { SqliteWorkspaceRepository } from "./sqlite-workspace-repo";
import { SqliteTaskRepository } from "./sqlite-task-repo";
import { SqliteAssignmentRepository } from "./sqlite-assignment-repo";
import { SqliteReviewRepository } from "./sqlite-review-repo";
import { SqliteApprovalRepository } from "./sqlite-approval-repo";
import { SqliteMeetingRepository } from "./sqlite-meeting-repo";
import { SqliteCollaborationRepository } from "./sqlite-collaboration-repo";
import { SqliteEventRepository } from "./sqlite-event-repo";
import { SqliteAuditRepository } from "./sqlite-audit-repo";
import { SqliteArtifactRepository } from "./sqlite-artifact-repo";
import {
  ProjectRepository,
  AgentRepository,
  WorkspaceRepository,
  TaskRepository,
  AssignmentRepository,
  ReviewRepository,
  ApprovalRepository,
  MeetingRepository,
  CollaborationRepository,
  EventRepository,
  AuditRepository,
  ArtifactRepository
} from "./types";

export * from "./types";
export * from "./sqlite-project-repo";
export * from "./sqlite-agent-repo";
export * from "./sqlite-workspace-repo";
export * from "./sqlite-task-repo";
export * from "./sqlite-assignment-repo";
export * from "./sqlite-review-repo";
export * from "./sqlite-approval-repo";
export * from "./sqlite-meeting-repo";
export * from "./sqlite-collaboration-repo";
export * from "./sqlite-event-repo";
export * from "./sqlite-audit-repo";
export * from "./sqlite-artifact-repo";

export interface Repositories {
  projects: ProjectRepository;
  agents: AgentRepository;
  workspaces: WorkspaceRepository;
  tasks: TaskRepository;
  assignments: AssignmentRepository;
  reviews: ReviewRepository;
  approvals: ApprovalRepository;
  meetings: MeetingRepository;
  collaborations: CollaborationRepository;
  events: EventRepository;
  audit: AuditRepository;
  artifacts: ArtifactRepository;
}

export function createRepositories(db: SqliteDatabase): Repositories {
  return {
    projects: new SqliteProjectRepository(db),
    agents: new SqliteAgentRepository(db),
    workspaces: new SqliteWorkspaceRepository(db),
    tasks: new SqliteTaskRepository(db),
    assignments: new SqliteAssignmentRepository(db),
    reviews: new SqliteReviewRepository(db),
    approvals: new SqliteApprovalRepository(db),
    meetings: new SqliteMeetingRepository(db),
    collaborations: new SqliteCollaborationRepository(db),
    events: new SqliteEventRepository(db),
    audit: new SqliteAuditRepository(db),
    artifacts: new SqliteArtifactRepository(db)
  };
}

let defaultRepositories: Repositories | null = null;

export function getDefaultRepositories(): Repositories {
  if (!defaultRepositories) {
    const db = getDefaultDb();
    runMigrations(db);
    defaultRepositories = createRepositories(db);
  }
  return defaultRepositories;
}
