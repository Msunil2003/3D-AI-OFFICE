import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import * as path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories, ConcurrencyConflictError } from "../apps/server/src/repositories";
import { GitWorktreeManager } from "../packages/git-worktree/src/index";
import { TaskService } from "../apps/server/src/services/task-service";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";
import {
  ReviewOrchestrator,
  ReviewValidationError,
  ReviewStateError
} from "../apps/server/src/services/review-orchestrator";
import {
  ApprovalService,
  StaleApprovalError,
  InvalidApprovalStateError
} from "../apps/server/src/services/approval-service";

test.describe("Phase 2F: Code Review & Approval Service", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let gitManager: GitWorktreeManager;
  let workspaceManager: WorkspaceManager;
  let taskService: TaskService;
  let reviewOrchestrator: ReviewOrchestrator;
  let approvalService: ApprovalService;
  let testRepoDir: string;
  let projectId: string;
  let reviewerId: string;

  test.beforeEach(async () => {
    db = createInMemoryDb();
    runMigrations(db);
    repos = createRepositories(db);
    gitManager = new GitWorktreeManager();
    workspaceManager = new WorkspaceManager(
      repos.workspaces,
      repos.projects,
      gitManager,
      repos.events,
      repos.audit
    );
    taskService = new TaskService(
      repos.tasks,
      repos.events,
      repos.audit
    );
    reviewOrchestrator = new ReviewOrchestrator(
      repos.reviews,
      repos.tasks,
      taskService,
      repos.projects,
      repos.workspaces,
      gitManager,
      repos.events,
      repos.audit
    );
    approvalService = new ApprovalService(
      repos.approvals,
      repos.tasks,
      repos.projects,
      repos.workspaces,
      gitManager,
      repos.events,
      repos.audit
    );

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `review-repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    execSync("git init -b main", { cwd: testRepoDir });
    execSync("git config user.name 'Reviewer Test'", { cwd: testRepoDir });
    execSync("git config user.email 'reviewer@aioffice.dev'", { cwd: testRepoDir });

    writeFileSync(path.join(testRepoDir, "index.ts"), 'export const version = "1.0.0";\n');
    execSync("git add index.ts", { cwd: testRepoDir });
    execSync('git commit -m "Initial commit for review test"', { cwd: testRepoDir });

    projectId = "proj-review";
    const now = new Date().toISOString();
    repos.projects.create({
      id: projectId,
      name: "Review Test Project",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: now,
      updatedAt: now
    });

    reviewerId = "agent-reviewer-1";
    repos.agents.create({
      id: reviewerId,
      name: "Senior Reviewer",
      role: "ARCHITECT",
      department: "Engineering",
      skills: { typescript: 5, security: 5 },
      status: "available",
      summary: "Ready for review",
      desk: { x: 1, y: 1 },
      provider: "mock",
      lastSeen: now
    });

    for (const devId of ["agent-dev-1", "agent-dev-2", "agent-dev-3", "agent-dev"]) {
      repos.agents.create({
        id: devId,
        name: `Dev ${devId}`,
        role: "DEVELOPER",
        department: "Engineering",
        skills: { typescript: 4 },
        status: "available",
        summary: "Working",
        desk: { x: 2, y: 2 },
        provider: "mock",
        lastSeen: now
      });
    }
  });

  test.afterEach(() => {
    if (existsSync(testRepoDir)) {
      try {
        rmSync(testRepoDir, { recursive: true, force: true });
      } catch {
        // Non-fatal
      }
    }
  });

  test("starts review, captures commit and diff hash, transitions task to IN_REVIEW", async () => {
    const task = taskService.createTask({
      projectId,
      title: "Add user authentication feature"
    });

    // Create workspace and worktree for task
    const workspace = await workspaceManager.createWorkspace({
      projectId,
      taskId: task.id,
      agentId: "agent-dev-1",
      agentSlug: "alice"
    });

    repos.tasks.update(task.id, {
      workspaceId: workspace.id,
      branch: workspace.branch
    });

    // Simulate agent work: make change and commit
    writeFileSync(path.join(workspace.path, "auth.ts"), 'export function login() { return true; }\n');
    const commitHash = await gitManager.commit(workspace.path, "feat: implement login");

    // Advance task through state machine: READY -> ASSIGNED -> IN_PROGRESS -> TESTING -> READY_FOR_REVIEW
    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    taskService.transitionTask(task.id, "TESTING");
    taskService.transitionTask(task.id, "READY_FOR_REVIEW");

    // Start code review
    const review = await reviewOrchestrator.startReview({
      taskId: task.id,
      reviewerId
    });

    expect(review.id).toMatch(/^rev-/);
    expect(review.status).toBe("IN_PROGRESS");
    expect(review.commitHash).toBe(commitHash);
    expect(review.diffHash).toBeDefined();
    expect(review.diffHash.length).toBe(64); // SHA-256

    const updatedTask = taskService.getTask(task.id);
    expect(updatedTask.status).toBe("IN_REVIEW");

    // Event & audit records emitted
    const events = repos.events.getByStreamId(review.id);
    expect(events.some((e) => e.type === "review.started")).toBe(true);
  });

  test("submitting critical or high findings requests changes and moves task back to IN_PROGRESS", async () => {
    const task = taskService.createTask({ projectId, title: "Add payment gateway" });
    const workspace = await workspaceManager.createWorkspace({
      projectId,
      taskId: task.id,
      agentId: "agent-dev-2"
    });
    repos.tasks.update(task.id, { workspaceId: workspace.id, branch: workspace.branch });

    writeFileSync(path.join(workspace.path, "pay.ts"), "const secretKey = 'hardcoded-secret';\n");
    await gitManager.commit(workspace.path, "feat: payment gateway");

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    taskService.transitionTask(task.id, "TESTING");
    taskService.transitionTask(task.id, "READY_FOR_REVIEW");

    const review = await reviewOrchestrator.startReview({ taskId: task.id, reviewerId });

    // Reviewer submits findings with CRITICAL severity
    const completedReview = await reviewOrchestrator.submitReview({
      reviewId: review.id,
      summary: "Security vulnerability detected",
      findings: [
        {
          severity: "CRITICAL",
          category: "SECURITY",
          file: "pay.ts",
          line: 1,
          message: "Hardcoded API secret key detected in source",
          recommendation: "Load secret from environment variable"
        }
      ]
    });

    expect(completedReview.status).toBe("CHANGES_REQUESTED");
    expect(completedReview.findings).toHaveLength(1);
    expect(completedReview.findings[0].status).toBe("PENDING");

    // Task transitioned back to IN_PROGRESS for rework
    const updatedTask = taskService.getTask(task.id);
    expect(updatedTask.status).toBe("IN_PROGRESS");

    // Verify finding can be resolved later
    const resolvedFinding = reviewOrchestrator.resolveFinding({
      findingId: completedReview.findings[0].id,
      resolvedCommit: "a".repeat(40),
      resolvedBy: "agent-dev-2",
      resolution: "Moved API secret to environment config"
    });

    expect(resolvedFinding.status).toBe("RESOLVED");
    expect(resolvedFinding.resolvedBy).toBe("agent-dev-2");
    expect(resolvedFinding.resolution).toContain("Moved API secret");
  });

  test("submitting clean/minor findings approves review and advances task to APPROVAL", async () => {
    const task = taskService.createTask({ projectId, title: "Add logging utility" });
    const workspace = await workspaceManager.createWorkspace({
      projectId,
      taskId: task.id,
      agentId: "agent-dev-3"
    });
    repos.tasks.update(task.id, { workspaceId: workspace.id, branch: workspace.branch });

    writeFileSync(path.join(workspace.path, "logger.ts"), "export const log = console.log;\n");
    await gitManager.commit(workspace.path, "feat: add logger");

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    taskService.transitionTask(task.id, "TESTING");
    taskService.transitionTask(task.id, "READY_FOR_REVIEW");

    const review = await reviewOrchestrator.startReview({ taskId: task.id, reviewerId });

    // Reviewer submits minor suggestions (no CRITICAL/HIGH)
    const approvedReview = await reviewOrchestrator.submitReview({
      reviewId: review.id,
      summary: "Code looks solid, minor style note only",
      findings: [
        {
          severity: "LOW",
          category: "STYLE",
          file: "logger.ts",
          line: 1,
          message: "Consider adding timestamp to logger output",
          recommendation: "Use ISO timestamp prefix"
        }
      ]
    });

    expect(approvedReview.status).toBe("APPROVED");
    const updatedTask = taskService.getTask(task.id);
    expect(updatedTask.status).toBe("APPROVAL");
  });

  test("rejects malformed review findings using Zod schema guard", async () => {
    const task = taskService.createTask({ projectId, title: "Add utility" });
    const workspace = await workspaceManager.createWorkspace({ projectId, taskId: task.id });
    repos.tasks.update(task.id, { workspaceId: workspace.id, branch: workspace.branch });

    writeFileSync(path.join(workspace.path, "util.ts"), "export const x = 1;\n");
    await gitManager.commit(workspace.path, "feat: util");

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    taskService.transitionTask(task.id, "TESTING");
    taskService.transitionTask(task.id, "READY_FOR_REVIEW");

    const review = await reviewOrchestrator.startReview({ taskId: task.id, reviewerId });

    // Invalid finding missing required fields or invalid category
    await expect(
      reviewOrchestrator.submitReview({
        reviewId: review.id,
        findings: [
          {
            severity: "INVALID_SEVERITY" as any,
            category: "INVALID_CAT" as any,
            file: "",
            message: "",
            recommendation: ""
          }
        ]
      })
    ).rejects.toThrow(ReviewValidationError);
  });

  test("approval service: creates approval request with idempotency", async () => {
    const approval = approvalService.createApproval({
      type: "MERGE",
      targetId: "task-test-1",
      targetRevision: 1,
      targetCommit: "c1".repeat(20),
      targetDiffHash: "d1".repeat(32),
      requesterId: "agent-lead",
      reason: "Feature completed and approved",
      idempotencyKey: "merge-task-test-1-c1"
    });

    expect(approval.id).toMatch(/^appr-/);
    expect(approval.status).toBe("PENDING");

    // Idempotent retry returns identical approval record
    const duplicate = approvalService.createApproval({
      type: "MERGE",
      targetId: "task-test-1",
      targetRevision: 1,
      targetCommit: "c1".repeat(20),
      targetDiffHash: "d1".repeat(32),
      requesterId: "agent-lead",
      reason: "Feature completed and approved",
      idempotencyKey: "merge-task-test-1-c1"
    });

    expect(duplicate.id).toBe(approval.id);
  });

  test("approval service: human approves and rejects with OCC checks", async () => {
    const approval = approvalService.createApproval({
      type: "PLAN_EXECUTION",
      targetId: "plan-123",
      targetRevision: 1,
      targetCommit: "none",
      targetDiffHash: "none",
      requesterId: "manager-lead",
      reason: "Plan approval request"
    });

    // Rejection test on different approval
    const approvalToReject = approvalService.createApproval({
      type: "PLAN_EXECUTION",
      targetId: "plan-456",
      targetRevision: 1,
      targetCommit: "none",
      targetDiffHash: "none",
      requesterId: "manager-lead",
      reason: "Bad plan"
    });

    const rejected = approvalService.reject(approvalToReject.id, {
      approverId: "human-user",
      reason: "Plan scope is too broad"
    });
    expect(rejected.status).toBe("REJECTED");

    // Approval test with OCC
    const approved = await approvalService.approve(approval.id, {
      approverId: "human-user",
      decisionNotes: "Looks good to proceed",
      expectedRevision: 1
    });

    expect(approved.status).toBe("APPROVED");
    expect(approved.approverId).toBe("human-user");
    expect(approved.revision).toBe(2);

    // Stale OCC conflict rejection
    await expect(
      approvalService.approve(approval.id, {
        approverId: "human-user",
        expectedRevision: 1 // Stale revision!
      })
    ).rejects.toThrow(InvalidApprovalStateError);
  });

  test("approval service: detects stale merge approval when branch HEAD or diff changes", async () => {
    const task = taskService.createTask({ projectId, title: "Database migration" });
    const workspace = await workspaceManager.createWorkspace({ projectId, taskId: task.id });
    repos.tasks.update(task.id, { workspaceId: workspace.id, branch: workspace.branch });

    writeFileSync(path.join(workspace.path, "migration.sql"), "CREATE TABLE users (id INT);\n");
    const commit1 = await gitManager.commit(workspace.path, "feat: migration");
    const diff1 = await gitManager.getDiff(workspace.path, { baseCommit: "main" });
    const diffHash1 = "some-diff-hash"; // Intentional mismatch to test stale detection

    const approval = approvalService.createApproval({
      type: "MERGE",
      targetId: task.id,
      targetRevision: 1,
      targetCommit: commit1,
      targetDiffHash: diffHash1,
      requesterId: "agent-dev",
      reason: "Ready to merge"
    });

    // Worker modifies file and commits again after approval was requested!
    writeFileSync(path.join(workspace.path, "migration.sql"), "CREATE TABLE users (id INT, email TEXT);\n");
    await gitManager.commit(workspace.path, "feat: add email to migration");

    // Approving now should detect that branch HEAD and diff have changed!
    await expect(
      approvalService.approve(approval.id, {
        approverId: "human-user"
      })
    ).rejects.toThrow(StaleApprovalError);

    // Verify approval record was marked STALE
    const staleApproval = approvalService.getApproval(approval.id);
    expect(staleApproval.status).toBe("STALE");
    expect(staleApproval.decisionNotes).toContain("stale");
  });
});
