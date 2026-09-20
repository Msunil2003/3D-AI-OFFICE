import { randomUUID } from "crypto";
import { GitWorktreeManager, GitMergeConflictError } from "@office/git-worktree";
import {
  AuditRepository,
  EventRepository,
  NotFoundError,
  ProjectRepository,
  TaskRepository,
  WorkspaceRepository
} from "../repositories";
import { ApprovalService } from "./approval-service";
import { TaskService } from "./task-service";
import { WorkspaceManager } from "./workspace-manager";

export class UnauthorizedMergeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedMergeError";
  }
}

export class MergeConflictError extends Error {
  constructor(public readonly conflictingFiles: string[]) {
    super(`Cannot merge: conflicts detected in files: ${conflictingFiles.join(", ")}`);
    this.name = "MergeConflictError";
  }
}

export interface ExecuteMergeParams {
  approvalId: string;
  taskId: string;
  targetBranch?: string;
  commitMessage?: string;
}

export interface MergeResult {
  mergeCommit: string;
  taskId: string;
  sourceBranch: string;
  targetBranch: string;
  completedAt: string;
}

export class MergeService {
  constructor(
    private approvalService: ApprovalService,
    private taskRepo: TaskRepository,
    private taskService: TaskService,
    private projectRepo: ProjectRepository,
    private workspaceRepo: WorkspaceRepository,
    private workspaceManager: WorkspaceManager,
    private gitManager: GitWorktreeManager,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Executes an authorized merge of a completed task branch into the project target branch.
   * Strictly verifies authorization from ApprovalService before performing Git operations.
   */
  public async executeMerge(params: ExecuteMergeParams): Promise<MergeResult> {
    // 1. Authorization Gate: Verify approval is granted and valid
    const auth = await this.approvalService.validateMergeAuthorization(params.approvalId);
    if (!auth.authorized) {
      throw new UnauthorizedMergeError(
        `Merge authorization failed for approval '${params.approvalId}': ${auth.reason || "Not authorized"}`
      );
    }

    const approval = auth.approval;
    if (approval.targetId !== params.taskId) {
      throw new UnauthorizedMergeError(
        `Approval target '${approval.targetId}' does not match requested taskId '${params.taskId}'`
      );
    }

    // 2. Validate Task and State
    const task = this.taskRepo.findById(params.taskId);
    if (!task) {
      throw new NotFoundError("Task", params.taskId);
    }

    if (task.status === "APPROVAL") {
      // Advance to READY_FOR_MERGE
      this.taskService.transitionTask(task.id, "READY_FOR_MERGE");
    } else if (task.status !== "READY_FOR_MERGE") {
      throw new Error(
        `Cannot merge task '${task.id}' in state '${task.status}'. Expected 'READY_FOR_MERGE' or 'APPROVAL'.`
      );
    }

    // 3. Retrieve Project & Workspace
    const project = this.projectRepo.findById(task.projectId);
    if (!project) {
      throw new NotFoundError("Project", task.projectId);
    }

    let workspace = task.workspaceId ? this.workspaceRepo.findById(task.workspaceId) : null;
    if (!workspace) {
      const projectWorkspaces = this.workspaceRepo.findByProjectId(task.projectId);
      workspace = projectWorkspaces.find((w) => w.branch === task.branch) || null;
    }

    if (!workspace) {
      throw new NotFoundError("Workspace", `for task ${task.id}`);
    }

    const targetBranch = params.targetBranch || project.defaultBranch || "main";
    const sourceBranch = task.branch || workspace.branch;

    // 4. Pre-Merge Conflict Detection
    const conflictInfo = await this.gitManager.detectConflicts(workspace.path, targetBranch);
    if (conflictInfo.hasConflicts) {
      throw new MergeConflictError(conflictInfo.conflictingFiles);
    }

    // 5. Execute Git Merge
    const message =
      params.commitMessage ||
      `feat(merge): merge task ${task.id} (${task.title}) from '${sourceBranch}' into '${targetBranch}'`;

    let mergeCommit: string;
    try {
      const mergeResult = await this.gitManager.mergeBranch({
        repoPath: project.localPath,
        sourceBranch,
        targetBranch,
        message
      });
      mergeCommit = mergeResult.mergeCommit;
    } catch (err: any) {
      if (err instanceof GitMergeConflictError) {
        throw new MergeConflictError([err.details]);
      }
      throw err;
    }

    const now = new Date().toISOString();

    // 6. Advance Task State to DONE
    this.taskService.transitionTask(task.id, "DONE");

    // 7. Safely Archive Workspace
    this.workspaceManager.archiveWorkspace(workspace.id);

    // 8. Event & Audit Trail
    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: task.id,
      correlationId: task.id,
      producer: "merge-service",
      schemaVersion: "1.0",
      type: "git.merged",
      payload: {
        taskId: task.id,
        approvalId: approval.id,
        sourceBranch,
        targetBranch,
        mergeCommit
      },
      timestamp: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: task.id,
      correlationId: task.id,
      producer: "merge-service",
      schemaVersion: "1.0",
      type: "task.completed",
      payload: {
        taskId: task.id,
        mergeCommit,
        completedAt: now
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "merge.executed",
      actorId: approval.approverId || "system",
      entityType: "MERGE",
      entityId: task.id,
      details: {
        approvalId: approval.id,
        sourceBranch,
        targetBranch,
        mergeCommit
      },
      timestamp: now
    });

    return {
      mergeCommit,
      taskId: task.id,
      sourceBranch,
      targetBranch,
      completedAt: now
    };
  }
}
