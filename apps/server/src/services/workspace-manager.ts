import { randomUUID } from "crypto";
import { existsSync } from "fs";
import * as path from "path";
import type { Workspace } from "@office/shared";
import { GitWorktreeManager, GitStatusResult } from "@office/git-worktree";
import {
  AuditRepository,
  EventRepository,
  NotFoundError,
  ProjectRepository,
  WorkspaceRepository
} from "../repositories";

export interface CreateWorkspaceParams {
  projectId: string;
  taskId: string;
  agentId?: string;
  agentSlug?: string;
}

export interface ReconcileResult {
  totalWorkspaces: number;
  healthy: number;
  reconciled: { workspaceId: string; prevStatus: string; newStatus: string; reason: string }[];
}

export class WorkspaceManager {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private projectRepo: ProjectRepository,
    private gitManager: GitWorktreeManager,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  private cleanSlug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  /**
   * Creates an isolated workspace and git worktree for a task.
   */
  public async createWorkspace(params: CreateWorkspaceParams): Promise<Workspace> {
    const project = this.projectRepo.findById(params.projectId);
    if (!project) {
      throw new NotFoundError("Project", params.projectId);
    }

    const cleanTask = this.cleanSlug(params.taskId);
    const taskSlug = cleanTask.startsWith("task-") ? cleanTask : `task-${cleanTask}`;
    const cleanAgent = params.agentSlug ? this.cleanSlug(params.agentSlug) : (params.agentId ? this.cleanSlug(params.agentId.slice(0, 8)) : "agent");
    const branch = `ai/${taskSlug}/${cleanAgent}`;
    const worktreeDirName = `ai-${taskSlug}-${cleanAgent}`;
    const worktreePath = path.join(project.localPath, ".aioffice", "worktrees", worktreeDirName);

    // Check if workspace record already exists for this path
    const existing = this.workspaceRepo.findByPath(worktreePath);
    if (existing) {
      return existing;
    }

    const workspaceId = `ws-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // 1. Create on-disk worktree via GitWorktreeManager
    const { worktreePath: createdPath } = await this.gitManager.createWorktree({
      repoPath: project.localPath,
      branch,
      worktreePath,
      baseCommit: project.defaultBranch
    });

    // 2. Persist workspace record
    const workspace = this.workspaceRepo.create({
      id: workspaceId,
      projectId: project.id,
      agentId: params.agentId,
      path: createdPath,
      branch,
      worktreeId: worktreeDirName,
      status: "READY",
      createdAt: now,
      updatedAt: now
    });

    // 3. Emit event
    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: workspace.id,
      correlationId: params.taskId,
      producer: "workspace-manager",
      schemaVersion: "1.0",
      type: "workspace.created",
      payload: {
        workspaceId: workspace.id,
        projectId: project.id,
        taskId: params.taskId,
        path: workspace.path,
        branch: workspace.branch
      },
      timestamp: now
    });

    // 4. Audit log
    this.auditRepo.append({
      id: randomUUID(),
      action: "workspace.created",
      actorId: params.agentId || "system",
      entityType: "WORKSPACE",
      entityId: workspace.id,
      details: {
        projectId: project.id,
        taskId: params.taskId,
        branch,
        path: createdPath
      },
      timestamp: now
    });

    return workspace;
  }

  public getWorkspace(workspaceId: string): Workspace {
    const ws = this.workspaceRepo.findById(workspaceId);
    if (!ws) {
      throw new NotFoundError("Workspace", workspaceId);
    }
    return ws;
  }

  /**
   * Inspects working tree status and updates workspace status to DIRTY if modified.
   */
  public async getWorkspaceStatus(workspaceId: string): Promise<{ workspace: Workspace; gitStatus: GitStatusResult }> {
    const ws = this.getWorkspace(workspaceId);
    const gitStatus = await this.gitManager.getStatus(ws.path);

    if (!gitStatus.clean && (ws.status === "READY" || ws.status === "IN_USE")) {
      const updated = this.workspaceRepo.update(ws.id, { status: "DIRTY" });
      return { workspace: updated, gitStatus };
    }

    return { workspace: ws, gitStatus };
  }

  /**
   * Archives a workspace safely.
   */
  public archiveWorkspace(workspaceId: string): Workspace {
    const ws = this.getWorkspace(workspaceId);
    const updated = this.workspaceRepo.update(ws.id, { status: "ARCHIVED" });
    const now = new Date().toISOString();

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: ws.id,
      producer: "workspace-manager",
      schemaVersion: "1.0",
      type: "workspace.archived",
      payload: { workspaceId: ws.id },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "workspace.archived",
      actorId: "system",
      entityType: "WORKSPACE",
      entityId: ws.id,
      details: { path: ws.path, branch: ws.branch },
      timestamp: now
    });

    return updated;
  }

  /**
   * Safely removes a worktree from disk and marks workspace as archived/removed.
   */
  public async removeWorkspace(workspaceId: string, options?: { force?: boolean }): Promise<void> {
    const ws = this.getWorkspace(workspaceId);
    const project = this.projectRepo.findById(ws.projectId);
    if (!project) {
      throw new NotFoundError("Project", ws.projectId);
    }

    // Call GitWorktreeManager (will throw GitDirtyWorktreeError if dirty and not force)
    await this.gitManager.removeWorktree({
      repoPath: project.localPath,
      worktreePath: ws.path,
      force: options?.force
    });

    this.workspaceRepo.delete(ws.id);
    const now = new Date().toISOString();

    this.auditRepo.append({
      id: randomUUID(),
      action: "workspace.removed",
      actorId: "system",
      entityType: "WORKSPACE",
      entityId: ws.id,
      details: { path: ws.path, branch: ws.branch, force: Boolean(options?.force) },
      timestamp: now
    });
  }

  /**
   * Reconciles registered workspaces against physical on-disk worktrees.
   */
  public async reconcileWorkspaces(projectId?: string): Promise<ReconcileResult> {
    const workspaces = projectId
      ? this.workspaceRepo.findByProjectId(projectId)
      : this.workspaceRepo.findAll();

    const result: ReconcileResult = {
      totalWorkspaces: workspaces.length,
      healthy: 0,
      reconciled: []
    };

    for (const ws of workspaces) {
      if (ws.status === "ARCHIVED" || ws.status === "FAILED") {
        continue;
      }

      if (!existsSync(ws.path)) {
        const prevStatus = ws.status;
        this.workspaceRepo.update(ws.id, { status: "RECOVERY_REQUIRED" });
        result.reconciled.push({
          workspaceId: ws.id,
          prevStatus,
          newStatus: "RECOVERY_REQUIRED",
          reason: "Workspace directory missing from filesystem"
        });
        continue;
      }

      try {
        const status = await this.gitManager.getStatus(ws.path);
        result.healthy++;
      } catch (err: any) {
        const prevStatus = ws.status;
        this.workspaceRepo.update(ws.id, { status: "RECOVERY_REQUIRED" });
        result.reconciled.push({
          workspaceId: ws.id,
          prevStatus,
          newStatus: "RECOVERY_REQUIRED",
          reason: `Git worktree corrupted or disconnected: ${err.message}`
        });
      }
    }

    return result;
  }
}
