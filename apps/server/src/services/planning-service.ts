import { randomUUID, createHash } from "crypto";
import {
  StructuredPlan,
  StructuredPlanSchema,
  DecomposedTaskPlan,
  Approval,
  Artifact
} from "@office/shared";
import {
  ArtifactRepository,
  ApprovalRepository,
  ProjectRepository,
  EventRepository,
  AuditRepository,
  NotFoundError
} from "../repositories/index";
import { GitWorktreeManager } from "@office/git-worktree";

export class PlanValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(`Plan validation failed: ${message}`);
    this.name = "PlanValidationError";
  }
}

export class InvalidPlanDependencyError extends Error {
  constructor(message: string) {
    super(`Invalid plan dependency graph: ${message}`);
    this.name = "InvalidPlanDependencyError";
  }
}

export interface CreatePlanRequest {
  projectId: string;
  goal: string;
  architecturalSummary?: string;
  tasks?: DecomposedTaskPlan[];
  risks?: string[];
  requesterId?: string;
}

export class PlanningService {
  constructor(
    private projectRepo: ProjectRepository,
    private artifactRepo: ArtifactRepository,
    private approvalRepo: ApprovalRepository,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository,
    private gitManager: GitWorktreeManager
  ) {}

  /**
   * Generates and validates a structured execution plan, saving it as an artifact
   * and creating a bound approval gate.
   */
  public async createPlan(request: CreatePlanRequest): Promise<{ plan: StructuredPlan; approval: Approval; artifact: Artifact }> {
    const project = this.projectRepo.findById(request.projectId);
    if (!project) {
      throw new NotFoundError("Project", request.projectId);
    }

    const planId = `plan-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // If explicit tasks not provided, synthesize deterministic default decomposition based on goal
    const rawTasks: DecomposedTaskPlan[] = request.tasks && request.tasks.length > 0
      ? request.tasks
      : this.synthesizeDefaultTasks(request.goal);

    const rawPlan = {
      id: planId,
      projectId: project.id,
      goal: request.goal,
      architecturalSummary: request.architecturalSummary || `Architectural plan for: ${request.goal}`,
      tasks: rawTasks,
      risks: request.risks || ["Potential regression in downstream consumers", "Merge conflict risk"],
      createdAt: now
    };

    // 1. Validate structured schema (Untrusted LLM output guard)
    const parseResult = StructuredPlanSchema.safeParse(rawPlan);
    if (!parseResult.success) {
      throw new PlanValidationError(parseResult.error.message, parseResult.error.format());
    }
    const plan = parseResult.data;

    // 2. Validate DAG dependencies (no cycles, no missing references)
    this.validatePlanDag(plan.tasks);

    // 3. Obtain current base commit
    let baseCommit = "0000000000000000000000000000000000000000";
    try {
      baseCommit = await this.gitManager.getCurrentCommit(project.localPath);
    } catch {
      // If repo not yet committed, fallback to zero hash
    }

    // 4. Save Plan as Generic Artifact (storageType: INLINE_JSON)
    const planJson = JSON.stringify(plan);
    const contentHash = createHash("sha256").update(planJson).digest("hex");

    const artifact = this.artifactRepo.create({
      id: planId,
      type: "PLAN",
      projectId: project.id,
      storageType: "INLINE_JSON",
      uri: `plan://${project.id}/${planId}`,
      contentHash,
      metadata: plan as unknown as Record<string, unknown>,
      version: 1,
      createdAt: now
    });

    // 5. Create bound Approval record (type: PLAN_EXECUTION)
    const approvalId = `appr-${randomUUID().slice(0, 8)}`;
    const approval = this.approvalRepo.create({
      id: approvalId,
      type: "PLAN_EXECUTION",
      targetId: artifact.id,
      targetRevision: 1,
      targetCommit: baseCommit,
      targetDiffHash: contentHash,
      status: "PENDING",
      requesterId: request.requesterId || "ai-manager",
      reason: `Plan execution approval for: ${request.goal}`,
      risk: plan.risks.length > 2 ? "HIGH" : "MEDIUM",
      evidence: {
        taskCount: plan.tasks.length,
        goal: plan.goal,
        planArtifactId: artifact.id
      },
      createdAt: now
    });

    // 6. Record Event & Audit
    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: plan.id,
      correlationId: plan.id,
      producer: "planning-service",
      schemaVersion: "1.0",
      type: "plan.created",
      payload: {
        planId: plan.id,
        projectId: project.id,
        approvalId: approval.id,
        goal: plan.goal,
        taskCount: plan.tasks.length
      },
      timestamp: now
    });

    this.auditRepo.append({
      id: randomUUID(),
      action: "plan.created",
      actorId: request.requesterId || "ai-manager",
      entityType: "PROJECT",
      entityId: project.id,
      details: {
        planId: plan.id,
        approvalId: approval.id,
        taskCount: plan.tasks.length
      },
      timestamp: now
    });

    return { plan, approval, artifact };
  }

  /**
   * Validates that the plan's tasks form a valid Directed Acyclic Graph.
   */
  public validatePlanDag(tasks: DecomposedTaskPlan[]): void {
    const taskIds = new Set(tasks.map((t) => t.tempId));

    // Check unknown dependencies
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          throw new InvalidPlanDependencyError(`Task "${task.tempId}" depends on non-existent task "${depId}"`);
        }
        if (depId === task.tempId) {
          throw new InvalidPlanDependencyError(`Task "${task.tempId}" cannot depend on itself`);
        }
      }
    }

    // Check cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const checkCycle = (currId: string): void => {
      visited.add(currId);
      recursionStack.add(currId);

      const task = tasks.find((t) => t.tempId === currId)!;
      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          checkCycle(depId);
        } else if (recursionStack.has(depId)) {
          throw new InvalidPlanDependencyError(`Cyclic dependency detected: ${currId} <-> ${depId}`);
        }
      }

      recursionStack.delete(currId);
    };

    for (const task of tasks) {
      if (!visited.has(task.tempId)) {
        checkCycle(task.tempId);
      }
    }
  }

  private synthesizeDefaultTasks(goal: string): DecomposedTaskPlan[] {
    return [
      {
        tempId: "t1",
        title: `Design & Implement: ${goal}`,
        description: `Implement core logic required for: ${goal}`,
        type: "FEATURE",
        priority: "HIGH",
        requiredRole: "BACKEND",
        requiredSkills: ["typescript", "node"],
        dependencies: [],
        estimatedComplexity: 3,
        riskLevel: "MEDIUM",
        acceptanceCriteria: ["Core functionality implemented", "Code adheres to project standards"]
      },
      {
        tempId: "t2",
        title: `Automated Tests for: ${goal}`,
        description: `Write automated unit and integration tests verifying: ${goal}`,
        type: "TEST",
        priority: "HIGH",
        requiredRole: "QA",
        requiredSkills: ["testing", "typescript"],
        dependencies: ["t1"],
        estimatedComplexity: 2,
        riskLevel: "LOW",
        acceptanceCriteria: ["All test cases pass", "Edge cases covered"]
      }
    ];
  }
}
