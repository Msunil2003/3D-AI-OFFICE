import { createHash, randomUUID } from "crypto";
import {
  Approval,
  ApprovalType,
  ApprovalStatus
} from "@office/shared";
import { GitWorktreeManager } from "@office/git-worktree";
import {
  ApprovalRepository,
  AuditRepository,
  ConcurrencyConflictError,
  EventRepository,
  NotFoundError,
  ProjectRepository,
  TaskRepository,
  WorkspaceRepository
} from "../repositories";

export class StaleApprovalError extends Error {
  constructor(message: string, public readonly details?: { expectedCommit: string; currentCommit: string; expectedDiffHash: string; currentDiffHash: string }) {
    super(message);
    this.name = "StaleApprovalError";
  }
}

export class InvalidApprovalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidApprovalStateError";
  }
}

export interface CreateApprovalParams {
  type: ApprovalType;
  targetId: string;
  targetRevision: number;
  targetCommit: string;
  targetDiffHash: string;
  requesterId: string;
  reason: string;
  risk?: "LOW" | "MEDIUM" | "HIGH";
  evidence?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface ApproveParams {
  approverId: string;
  decisionNotes?: string;
  expectedRevision?: number;
}

export interface RejectParams {
  approverId: string;
  reason: string;
  expectedRevision?: number;
}

export class ApprovalService {
  constructor(
    private approvalRepo: ApprovalRepository,
    private taskRepo: TaskRepository,
    private projectRepo: ProjectRepository,
    private workspaceRepo: WorkspaceRepository,
    private gitManager: GitWorktreeManager,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Creates an approval request bound to targetCommit and targetDiffHash.
   * Supports idempotency via idempotencyKey.
   */
  public createApproval(params: CreateApprovalParams): Approval {
    if (params.idempotencyKey) {
      const existing = this.approvalRepo.findByIdempotencyKey(params.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const approvalId = `appr-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const approval = this.approvalRepo.create({
      id: approvalId,
      type: params.type,
      targetId: params.targetId,
      targetRevision: params.targetRevision,
      targetCommit: params.targetCommit,
      targetDiffHash: params.targetDiffHash,
      status: "PENDING",
      requesterId: params.requesterId,
      reason: params.reason,
      risk: params.risk || "MEDIUM",
      evidence: params.evidence || {},
      idempotencyKey: params.idempotencyKey,
      createdAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: approval.id,
      correlationId: params.targetId,
      producer: "approval-service",
      schemaVersion: "1.0",
      type: "approval.requested",
      payload: {
        approvalId: approval.id,
        type: approval.type,
        targetId: approval.targetId,
        targetCommit: approval.targetCommit,
        targetDiffHash: approval.targetDiffHash,
        requesterId: approval.requesterId,
        risk: approval.risk
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "approval.requested",
      actorId: params.requesterId,
      entityType: "APPROVAL",
      entityId: approval.id,
      details: {
        type: approval.type,
        targetId: approval.targetId,
        targetCommit: approval.targetCommit,
        targetDiffHash: approval.targetDiffHash
      },
      idempotencyKey: params.idempotencyKey,
      timestamp: now
    });

    return approval;
  }

  /**
   * Approves an action. For MERGE approvals, validates that target branch HEAD and diff have not mutated.
   * Enforces optimistic concurrency control (OCC).
   */
  public async approve(approvalId: string, params: ApproveParams): Promise<Approval> {
    const approval = this.approvalRepo.findById(approvalId);
    if (!approval) {
      throw new NotFoundError("Approval", approvalId);
    }

    if (approval.status !== "PENDING") {
      throw new InvalidApprovalStateError(
        `Cannot approve approval '${approval.id}' with status '${approval.status}'. Expected 'PENDING'.`
      );
    }

    // Stale check for MERGE approvals
    if (approval.type === "MERGE") {
      const task = this.taskRepo.findById(approval.targetId);
      if (task) {
        let workspace = task.workspaceId ? this.workspaceRepo.findById(task.workspaceId) : null;
        if (!workspace) {
          const projectWorkspaces = this.workspaceRepo.findByProjectId(task.projectId);
          workspace = projectWorkspaces.find((w) => w.branch === task.branch) || null;
        }

        if (workspace) {
          const currentCommit = await this.gitManager.getCurrentCommit(workspace.path);
          const project = this.projectRepo.findById(workspace.projectId);
          const baseBranch = project?.defaultBranch || "main";
          const currentDiff = await this.gitManager.getDiff(workspace.path, {
            baseCommit: baseBranch,
            includeUntracked: true
          });
          const currentDiffHash = createHash("sha256").update(currentDiff).digest("hex");

          if (currentCommit !== approval.targetCommit || currentDiffHash !== approval.targetDiffHash) {
            const staleReason = `Approval is stale: target commit or diff hash changed (expected commit ${approval.targetCommit.slice(0, 8)}, current ${currentCommit.slice(0, 8)})`;
            
            this.approvalRepo.update(
              approval.id,
              {
                status: "STALE",
                decisionNotes: staleReason
              },
              params.expectedRevision
            );

            const now = new Date().toISOString();
            this.eventRepo.append({
              eventId: randomUUID(),
              streamId: approval.id,
              correlationId: approval.targetId,
              producer: "approval-service",
              schemaVersion: "1.0",
              type: "approval.stale",
              payload: {
                approvalId: approval.id,
                expectedCommit: approval.targetCommit,
                currentCommit,
                expectedDiffHash: approval.targetDiffHash,
                currentDiffHash
              },
              timestamp: now
            });

            this.auditRepo.append({
              id: randomUUID(),
              action: "approval.stale",
              actorId: params.approverId,
              entityType: "APPROVAL",
              entityId: approval.id,
              details: {
                expectedCommit: approval.targetCommit,
                currentCommit,
                expectedDiffHash: approval.targetDiffHash,
                currentDiffHash
              },
              timestamp: now
            });

            throw new StaleApprovalError(staleReason, {
              expectedCommit: approval.targetCommit,
              currentCommit,
              expectedDiffHash: approval.targetDiffHash,
              currentDiffHash
            });
          }
        }
      }
    }

    const now = new Date().toISOString();
    const updated = this.approvalRepo.update(
      approval.id,
      {
        status: "APPROVED",
        approverId: params.approverId,
        decisionNotes: params.decisionNotes,
        decidedAt: now
      },
      params.expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: approval.id,
      correlationId: approval.targetId,
      producer: "approval-service",
      schemaVersion: "1.0",
      type: "approval.approved",
      payload: {
        approvalId: approval.id,
        approverId: params.approverId,
        decisionNotes: params.decisionNotes
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "approval.approved",
      actorId: params.approverId,
      entityType: "APPROVAL",
      entityId: approval.id,
      details: {
        approverId: params.approverId,
        decisionNotes: params.decisionNotes
      },
      timestamp: now
    });

    return updated;
  }

  /**
   * Rejects an approval request with reason and OCC support.
   */
  public reject(approvalId: string, params: RejectParams): Approval {
    const approval = this.approvalRepo.findById(approvalId);
    if (!approval) {
      throw new NotFoundError("Approval", approvalId);
    }

    if (approval.status !== "PENDING") {
      throw new InvalidApprovalStateError(
        `Cannot reject approval '${approval.id}' with status '${approval.status}'. Expected 'PENDING'.`
      );
    }

    const now = new Date().toISOString();
    const updated = this.approvalRepo.update(
      approval.id,
      {
        status: "REJECTED",
        approverId: params.approverId,
        decisionNotes: params.reason,
        decidedAt: now
      },
      params.expectedRevision
    );

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: approval.id,
      correlationId: approval.targetId,
      producer: "approval-service",
      schemaVersion: "1.0",
      type: "approval.rejected",
      payload: {
        approvalId: approval.id,
        approverId: params.approverId,
        reason: params.reason
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "approval.rejected",
      actorId: params.approverId,
      entityType: "APPROVAL",
      entityId: approval.id,
      details: {
        approverId: params.approverId,
        reason: params.reason
      },
      timestamp: now
    });

    return updated;
  }

  /**
   * Validates whether a MERGE action is formally authorized.
   */
  public async validateMergeAuthorization(approvalId: string): Promise<{ authorized: boolean; approval: Approval; reason?: string }> {
    const approval = this.approvalRepo.findById(approvalId);
    if (!approval) {
      throw new NotFoundError("Approval", approvalId);
    }

    if (approval.type !== "MERGE") {
      return {
        authorized: false,
        approval,
        reason: `Approval type '${approval.type}' is not 'MERGE'`
      };
    }

    if (approval.status !== "APPROVED") {
      return {
        authorized: false,
        approval,
        reason: `Approval status is '${approval.status}', expected 'APPROVED'`
      };
    }

    // Verify commit integrity against task workspace
    const task = this.taskRepo.findById(approval.targetId);
    if (task) {
      let workspace = task.workspaceId ? this.workspaceRepo.findById(task.workspaceId) : null;
      if (!workspace) {
        const projectWorkspaces = this.workspaceRepo.findByProjectId(task.projectId);
        workspace = projectWorkspaces.find((w) => w.branch === task.branch) || null;
      }

      if (workspace) {
        const currentCommit = await this.gitManager.getCurrentCommit(workspace.path);
        if (currentCommit !== approval.targetCommit) {
          return {
            authorized: false,
            approval,
            reason: `Branch HEAD (${currentCommit.slice(0, 8)}) does not match approved commit (${approval.targetCommit.slice(0, 8)})`
          };
        }
      }
    }

    return { authorized: true, approval };
  }

  public getApproval(id: string): Approval {
    const approval = this.approvalRepo.findById(id);
    if (!approval) {
      throw new NotFoundError("Approval", id);
    }
    return approval;
  }

  public getPendingApprovals(): Approval[] {
    return this.approvalRepo.findPending();
  }

  public getApprovalsForTarget(targetId: string): Approval[] {
    return this.approvalRepo.findByTargetId(targetId);
  }
}
