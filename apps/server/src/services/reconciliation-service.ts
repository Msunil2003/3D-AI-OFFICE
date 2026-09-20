import { existsSync } from "fs";
import { randomUUID } from "crypto";
import {
  Task,
  Workspace,
  WorkspaceStatus
} from "@office/shared";
import {
  AuditRepository,
  EventRepository,
  NotFoundError,
  ProjectRepository,
  TaskRepository,
  WorkspaceRepository
} from "../repositories";
import { GitWorktreeManager } from "@office/git-worktree";

export interface ReconciliationReport {
  reconciledWorkspaces: number;
  corruptedWorkspaces: string[];
  reconciledTasks: number;
  blockedTasks: string[];
  recoveredWorkspaces: string[];
}

export class ReconciliationService {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository,
    private gitManager: GitWorktreeManager,
    private runtimeChecker?: (agentId: string) => boolean
  ) {}

  /**
   * Reconciles all active workspaces and tasks upon server startup or after a crash.
   */
  public async reconcileAll(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      reconciledWorkspaces: 0,
      corruptedWorkspaces: [],
      reconciledTasks: 0,
      blockedTasks: [],
      recoveredWorkspaces: []
    };

    // 1. Reconcile Workspaces
    const allWorkspaces = this.workspaceRepo.findAll();
    for (const ws of allWorkspaces) {
      if (ws.status === "ARCHIVED" || ws.status === "FAILED") {
        continue;
      }

      report.reconciledWorkspaces++;
      const now = new Date().toISOString();

      if (!existsSync(ws.path)) {
        this.workspaceRepo.update(ws.id, {
          status: "RECOVERY_REQUIRED",
          updatedAt: now
        });
        report.corruptedWorkspaces.push(ws.id);

        this.eventRepo.append({
          eventId: randomUUID(),
          streamId: ws.id,
          correlationId: ws.projectId,
          producer: "reconciliation-service",
          schemaVersion: "1.0",
          type: "workspace.recovery_required",
          payload: {
            workspaceId: ws.id,
            reason: "Worktree path does not exist on disk"
          },
          timestamp: now
        });

        this.auditRepo.append({
          id: randomUUID(),
          action: "workspace.reconciliation_failed",
          actorId: "system",
          entityType: "WORKSPACE",
          entityId: ws.id,
          details: {
            reason: "Worktree directory missing on disk"
          },
          timestamp: now
        });
        continue;
      }

      // Check git worktree health
      try {
        await this.gitManager.getStatus(ws.path);
      } catch (err) {
        this.workspaceRepo.update(ws.id, {
          status: "RECOVERY_REQUIRED",
          updatedAt: now
        });
        report.corruptedWorkspaces.push(ws.id);

        this.eventRepo.append({
          eventId: randomUUID(),
          streamId: ws.id,
          correlationId: ws.projectId,
          producer: "reconciliation-service",
          schemaVersion: "1.0",
          type: "workspace.recovery_required",
          payload: {
            workspaceId: ws.id,
            reason: `Git worktree corrupted: ${String(err)}`
          },
          timestamp: now
        });

        this.auditRepo.append({
          id: randomUUID(),
          action: "workspace.reconciliation_corrupted",
          actorId: "system",
          entityType: "WORKSPACE",
          entityId: ws.id,
          details: {
            error: String(err)
          },
          timestamp: now
        });
      }
    }

    // 2. Reconcile Tasks
    const allTasks = this.taskRepo.findAll();
    const activeStatuses: Task["status"][] = ["IN_PROGRESS", "TESTING", "READY_FOR_REVIEW", "IN_REVIEW"];

    for (const task of allTasks) {
      if (!activeStatuses.includes(task.status)) {
        continue;
      }

      report.reconciledTasks++;
      const now = new Date().toISOString();

      // Check if associated workspace requires recovery
      if (task.workspaceId) {
        const ws = this.workspaceRepo.findById(task.workspaceId);
        if (ws && (ws.status === "RECOVERY_REQUIRED" || ws.status === "FAILED")) {
          this.taskRepo.update(task.id, {
            blocked: true,
            blockedReason: `Workspace '${ws.id}' requires recovery`,
            updatedAt: now
          });
          report.blockedTasks.push(task.id);

          this.eventRepo.append({
            eventId: randomUUID(),
            streamId: task.id,
            correlationId: task.projectId,
            producer: "reconciliation-service",
            schemaVersion: "1.0",
            type: "task.blocked",
            payload: {
              taskId: task.id,
              reason: `Workspace '${ws.id}' requires recovery`
            },
            timestamp: now
          });
          continue;
        }
      }

      // Check runtime process health if checker provided
      const agentId = task.assigneeId || (task as any).agentId;
      if (agentId && this.runtimeChecker) {
        const isAlive = this.runtimeChecker(agentId);
        if (!isAlive) {
          this.taskRepo.update(task.id, {
            blocked: true,
            blockedReason: "Agent runtime process session lost during restart/crash",
            updatedAt: now
          });
          report.blockedTasks.push(task.id);

          this.eventRepo.append({
            eventId: randomUUID(),
            streamId: task.id,
            correlationId: task.projectId,
            producer: "reconciliation-service",
            schemaVersion: "1.0",
            type: "task.blocked",
            payload: {
              taskId: task.id,
              reason: "Agent runtime process session lost"
            },
            timestamp: now
          });
        }
      }
    }

    return report;
  }

  /**
   * Attempts recovery of a workspace marked RECOVERY_REQUIRED.
   */
  public async recoverWorkspace(workspaceId: string): Promise<Workspace> {
    const ws = this.workspaceRepo.findById(workspaceId);
    if (!ws) {
      throw new NotFoundError("Workspace", workspaceId);
    }

    const project = this.projectRepo.findById(ws.projectId);
    if (!project) {
      throw new NotFoundError("Project", ws.projectId);
    }

    const now = new Date().toISOString();

    // If directory exists and git status succeeds, transition to READY
    if (existsSync(ws.path)) {
      try {
        await this.gitManager.getStatus(ws.path);
        const recovered = this.workspaceRepo.update(ws.id, {
          status: "READY",
          updatedAt: now
        });

        this.eventRepo.append({
          eventId: randomUUID(),
          streamId: ws.id,
          correlationId: ws.projectId,
          producer: "reconciliation-service",
          schemaVersion: "1.0",
          type: "workspace.recovered",
          payload: { workspaceId: ws.id, status: "READY" },
          timestamp: now
        });

        this.auditRepo.append({
          id: randomUUID(),
          action: "workspace.recovered",
          actorId: "system",
          entityType: "WORKSPACE",
          entityId: ws.id,
          details: { outcome: "Integrity verified, transitioned to READY" },
          timestamp: now
        });

        return recovered;
      } catch {
        // Fall through to re-creation
      }
    }

    // Re-create worktree from branch
    const branch = ws.branch;
    const worktree = await this.gitManager.createWorktree({
      repoPath: project.localPath,
      branch
    });

    const updated = this.workspaceRepo.update(ws.id, {
      path: worktree.worktreePath,
      status: "READY",
      updatedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: ws.id,
      correlationId: ws.projectId,
      producer: "reconciliation-service",
      schemaVersion: "1.0",
      type: "workspace.recovered",
      payload: { workspaceId: ws.id, path: worktree.worktreePath, status: "READY" },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "workspace.recovered",
      actorId: "system",
      entityType: "WORKSPACE",
      entityId: ws.id,
      details: { outcome: "Worktree reconstructed from git branch" },
      timestamp: now
    });

    return updated;
  }
}
