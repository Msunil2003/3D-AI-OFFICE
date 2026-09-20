import { createHash, randomUUID } from "crypto";
import {
  Review,
  ReviewFinding,
  ReviewFindingSchema,
  ReviewStatus,
  FindingSeverity
} from "@office/shared";
import { GitWorktreeManager } from "@office/git-worktree";
import {
  AuditRepository,
  EventRepository,
  NotFoundError,
  ProjectRepository,
  ReviewRepository,
  TaskRepository,
  WorkspaceRepository
} from "../repositories";
import { TaskService } from "./task-service";

export class ReviewValidationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = "ReviewValidationError";
  }
}

export class ReviewStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewStateError";
  }
}

export interface StartReviewParams {
  taskId: string;
  reviewerId: string;
}

export type ReviewFindingInput = Omit<ReviewFinding, "id" | "reviewId">;

export interface SubmitReviewParams {
  reviewId: string;
  summary?: string;
  findings: ReviewFindingInput[];
}

export interface ResolveFindingParams {
  findingId: string;
  resolvedCommit?: string;
  resolvedBy: string;
  resolution: string;
}

export class ReviewOrchestrator {
  constructor(
    private reviewRepo: ReviewRepository,
    private taskRepo: TaskRepository,
    private taskService: TaskService,
    private projectRepo: ProjectRepository,
    private workspaceRepo: WorkspaceRepository,
    private gitManager: GitWorktreeManager,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository
  ) {}

  /**
   * Starts a code review for a task, capturing the current commit and diff hash.
   */
  public async startReview(params: StartReviewParams): Promise<Review> {
    const task = this.taskRepo.findById(params.taskId);
    if (!task) {
      throw new NotFoundError("Task", params.taskId);
    }

    // Check if task can enter review
    if (task.status === "READY_FOR_REVIEW") {
      this.taskService.transitionTask(task.id, "IN_REVIEW");
    } else if (task.status !== "IN_REVIEW") {
      throw new ReviewStateError(
        `Cannot start review for task '${task.id}' in state '${task.status}'. Task must be in READY_FOR_REVIEW or IN_REVIEW.`
      );
    }

    // Locate workspace for the task
    let workspace = task.workspaceId ? this.workspaceRepo.findById(task.workspaceId) : null;
    if (!workspace) {
      const projectWorkspaces = this.workspaceRepo.findByProjectId(task.projectId);
      workspace = projectWorkspaces.find((w) => w.branch === task.branch) || null;
    }

    if (!workspace) {
      throw new NotFoundError("Workspace", `for task ${task.id}`);
    }

    const project = this.projectRepo.findById(workspace.projectId);
    const baseBranch = project?.defaultBranch || "main";

    // Capture current commit and diff
    const commitHash = await this.gitManager.getCurrentCommit(workspace.path);
    const diff = await this.gitManager.getDiff(workspace.path, {
      baseCommit: baseBranch,
      includeUntracked: true
    });
    const diffHash = createHash("sha256").update(diff).digest("hex");

    const reviewId = `rev-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const review = this.reviewRepo.createReview({
      id: reviewId,
      taskId: task.id,
      reviewerId: params.reviewerId,
      status: "IN_PROGRESS",
      summary: "Code review in progress",
      commitHash,
      diffHash,
      findings: [],
      createdAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: review.id,
      correlationId: task.id,
      producer: "review-orchestrator",
      schemaVersion: "1.0",
      type: "review.started",
      payload: {
        reviewId: review.id,
        taskId: task.id,
        reviewerId: params.reviewerId,
        commitHash,
        diffHash
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "review.started",
      actorId: params.reviewerId,
      entityType: "TASK",
      entityId: task.id,
      details: {
        reviewId: review.id,
        commitHash,
        diffHash
      },
      timestamp: now
    });

    return review;
  }

  /**
   * Submits findings and completes the review.
   * If any finding has severity HIGH or CRITICAL, marks review as CHANGES_REQUESTED and transitions task back to IN_PROGRESS.
   * Otherwise marks review as APPROVED and transitions task to APPROVAL.
   */
  public async submitReview(params: SubmitReviewParams): Promise<Review> {
    const review = this.reviewRepo.findReviewById(params.reviewId);
    if (!review) {
      throw new NotFoundError("Review", params.reviewId);
    }

    if (review.status !== "IN_PROGRESS") {
      throw new ReviewStateError(
        `Cannot submit review '${review.id}' in state '${review.status}'. Only IN_PROGRESS reviews can be submitted.`
      );
    }

    const task = this.taskRepo.findById(review.taskId);
    if (!task) {
      throw new NotFoundError("Task", review.taskId);
    }

    // Validate findings against schema
    const validatedFindings: ReviewFinding[] = [];
    for (const findingInput of params.findings) {
      const findingWithReview: ReviewFinding = {
        id: `find-${randomUUID().slice(0, 8)}`,
        reviewId: review.id,
        severity: findingInput.severity || "MEDIUM",
        category: findingInput.category || "CORRECTNESS",
        file: findingInput.file,
        line: findingInput.line,
        message: findingInput.message,
        recommendation: findingInput.recommendation,
        evidence: findingInput.evidence,
        status: "PENDING",
        introducedCommit: findingInput.introducedCommit || review.commitHash,
        resolvedCommit: findingInput.resolvedCommit,
        resolvedAt: findingInput.resolvedAt,
        resolvedBy: findingInput.resolvedBy,
        resolution: findingInput.resolution
      };

      const parseResult = ReviewFindingSchema.safeParse(findingWithReview);
      if (!parseResult.success) {
        throw new ReviewValidationError(
          `Invalid review finding for file '${findingInput.file}': ${parseResult.error.message}`,
          parseResult.error.format()
        );
      }

      const persistedFinding = this.reviewRepo.addFinding(parseResult.data);
      validatedFindings.push(persistedFinding);
    }

    // Determine verdict
    const hasBlockers = validatedFindings.some(
      (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
    );

    const now = new Date().toISOString();
    let nextReviewStatus: ReviewStatus;
    let eventType: string;

    if (hasBlockers) {
      nextReviewStatus = "CHANGES_REQUESTED";
      eventType = "review.changes_requested";
      // Transition task back to IN_PROGRESS for rework
      this.taskService.transitionTask(task.id, "IN_PROGRESS");
    } else {
      nextReviewStatus = "APPROVED";
      eventType = "review.approved";
      // Transition task to APPROVAL stage for human merge gate
      this.taskService.transitionTask(task.id, "APPROVAL");
    }

    const updatedReview = this.reviewRepo.updateReview(review.id, {
      status: nextReviewStatus,
      summary: params.summary || (hasBlockers ? "Changes requested due to issues found" : "Review approved"),
      completedAt: now
    });

    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: review.id,
      correlationId: task.id,
      producer: "review-orchestrator",
      schemaVersion: "1.0",
      type: eventType,
      payload: {
        reviewId: review.id,
        taskId: task.id,
        status: nextReviewStatus,
        findingsCount: validatedFindings.length,
        hasBlockers
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: eventType,
      actorId: review.reviewerId,
      entityType: "TASK",
      entityId: task.id,
      details: {
        reviewId: review.id,
        status: nextReviewStatus,
        findingsCount: validatedFindings.length,
        hasBlockers
      },
      timestamp: now
    });

    return {
      ...updatedReview,
      findings: validatedFindings
    };
  }

  /**
   * Resolves an individual review finding with traceable commit and actor info.
   */
  public resolveFinding(params: ResolveFindingParams): ReviewFinding {
    const now = new Date().toISOString();
    const updated = this.reviewRepo.updateFinding(params.findingId, {
      status: "RESOLVED",
      resolvedCommit: params.resolvedCommit,
      resolvedBy: params.resolvedBy,
      resolvedAt: now,
      resolution: params.resolution
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "finding.resolved",
      actorId: params.resolvedBy,
      entityType: "TASK",
      entityId: updated.reviewId,
      details: {
        findingId: params.findingId,
        resolvedCommit: params.resolvedCommit,
        resolution: params.resolution
      },
      timestamp: now
    });

    return updated;
  }

  public getReview(reviewId: string): Review {
    const review = this.reviewRepo.findReviewById(reviewId);
    if (!review) {
      throw new NotFoundError("Review", reviewId);
    }
    return review;
  }

  public getReviewsForTask(taskId: string): Review[] {
    return this.reviewRepo.findReviewsByTaskId(taskId);
  }

  public getFindings(reviewId: string): ReviewFinding[] {
    return this.reviewRepo.findFindingsByReviewId(reviewId);
  }
}
