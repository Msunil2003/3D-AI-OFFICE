import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { RuntimeRegistry, MockRuntime, MOCK_CAPABILITIES } from "@office/runtime-core";
import { GitWorktreeManager } from "@office/git-worktree";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";
import { TaskService } from "../apps/server/src/services/task-service";
import { AssignmentService } from "../apps/server/src/services/assignment-service";
import { AgentCandidateScorer } from "../apps/server/src/services/agent-scorer";
import { PlanningService } from "../apps/server/src/services/planning-service";
import { ProgressMonitor } from "../apps/server/src/services/progress-monitor";
import { ManagerService } from "../apps/server/src/services/manager-service";
import { AgentExecutionService } from "../apps/server/src/services/agent-execution-service";
import { ReviewOrchestrator } from "../apps/server/src/services/review-orchestrator";
import { ApprovalService } from "../apps/server/src/services/approval-service";
import { MergeService } from "../apps/server/src/services/merge-service";

test.describe("Phase 2J: Golden Path E2E Virtual Organization Workflow", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let gitManager: GitWorktreeManager;
  let workspaceManager: WorkspaceManager;
  let taskService: TaskService;
  let assignmentService: AssignmentService;
  let agentScorer: AgentCandidateScorer;
  let planningService: PlanningService;
  let progressMonitor: ProgressMonitor;
  let managerService: ManagerService;
  let runtimeRegistry: RuntimeRegistry;
  let executionService: AgentExecutionService;
  let reviewOrchestrator: ReviewOrchestrator;
  let approvalService: ApprovalService;
  let mergeService: MergeService;

  let testRepoDir: string;
  let projectId: string;

  test.beforeEach(async () => {
    db = createInMemoryDb();
    runMigrations(db);
    repos = createRepositories(db);

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `e2e-repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    // Initialize real git repo with default branch main
    execSync("git init -b main", { cwd: testRepoDir });
    execSync('git config user.name "AI Office Golden Path"', { cwd: testRepoDir });
    execSync('git config user.email "goldenpath@aioffice.dev"', { cwd: testRepoDir });
    writeFileSync(path.join(testRepoDir, "README.md"), "# Production System Core\nBaseline version 1.0\n");
    execSync("git add README.md", { cwd: testRepoDir });
    execSync('git commit -m "initial commit: project scaffold"', { cwd: testRepoDir });

    gitManager = new GitWorktreeManager();
    workspaceManager = new WorkspaceManager(
      repos.workspaces,
      repos.projects,
      gitManager,
      repos.events,
      repos.audit
    );
    taskService = new TaskService(repos.tasks, repos.events, repos.audit);
    assignmentService = new AssignmentService(
      repos.tasks,
      repos.agents,
      repos.assignments,
      workspaceManager,
      repos.events,
      repos.audit
    );
    agentScorer = new AgentCandidateScorer();
    planningService = new PlanningService(
      repos.projects,
      repos.artifacts,
      repos.approvals,
      repos.events,
      repos.audit,
      gitManager
    );
    progressMonitor = new ProgressMonitor(repos.projects, repos.tasks, repos.assignments);
    managerService = new ManagerService(
      planningService,
      taskService,
      assignmentService,
      agentScorer,
      progressMonitor,
      repos.projects,
      repos.tasks,
      repos.agents,
      repos.approvals,
      repos.artifacts,
      repos.events,
      repos.audit
    );

    runtimeRegistry = new RuntimeRegistry();
    runtimeRegistry.registerProvider(
      "mock",
      (config) => new MockRuntime(config),
      MOCK_CAPABILITIES
    );
    executionService = new AgentExecutionService(
      repos.tasks,
      repos.workspaces,
      repos.agents,
      repos.assignments,
      repos.projects,
      repos.events,
      repos.audit,
      repos.artifacts,
      gitManager,
      workspaceManager,
      taskService,
      runtimeRegistry
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

    mergeService = new MergeService(
      approvalService,
      repos.tasks,
      taskService,
      repos.projects,
      repos.workspaces,
      workspaceManager,
      gitManager,
      repos.events,
      repos.audit
    );

    // Onboard Project
    projectId = "proj-e2e-enterprise";
    const now = new Date().toISOString();
    repos.projects.create({
      id: projectId,
      name: "Enterprise Core Platform",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: now,
      updatedAt: now
    });

    // Seed Organization Agents
    repos.agents.create({
      id: "agent-lead-eva",
      name: "Eva Manager",
      role: "MANAGER",
      department: "Management",
      skills: { management: 5, architecture: 4 },
      status: "available",
      summary: "Directing development sprints",
      desk: { x: 0, y: 0 },
      provider: "mock",
      lastSeen: now
    });

    repos.agents.create({
      id: "agent-dev-alex",
      name: "Alex Fullstack",
      role: "DEVELOPER",
      department: "Engineering",
      skills: { typescript: 5, node: 5, architecture: 4 },
      status: "available",
      summary: "Ready for task assignments",
      desk: { x: 1, y: 1 },
      provider: "mock",
      lastSeen: now
    });

    repos.agents.create({
      id: "agent-arch-marcus",
      name: "Marcus Architect",
      role: "ARCHITECT",
      department: "Engineering",
      skills: { typescript: 5, security: 5, architecture: 5 },
      status: "available",
      summary: "Available for code & architecture review",
      desk: { x: 2, y: 2 },
      provider: "mock",
      lastSeen: now
    });
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

  test("executes complete 16-step Golden Path workflow from high-level prompt to Git merge and task completion", async () => {
    // 1. User submits high-level goal to AI Manager
    const planResult = await managerService.createPlan({
      projectId,
      goal: "Implement customer identity and token validation middleware",
      requesterId: "human-owner"
    });

    expect(planResult.plan.tasks.length).toBeGreaterThan(0);
    expect(planResult.approval.status).toBe("PENDING");

    // 2. Human reviews and approves structured plan
    const approvedResult = await managerService.approvePlan(planResult.plan.id, {
      approverId: "human-owner",
      autoAssign: true
    });

    expect(approvedResult.approved).toBe(true);
    expect(approvedResult.tasks.length).toBeGreaterThan(0);
    expect(approvedResult.assignments.length).toBeGreaterThan(0);

    const activeTask = approvedResult.tasks[0];
    const activeAssignment = approvedResult.assignments[0];
    expect(activeAssignment.status).toBe("ACTIVE");
    expect(activeAssignment.workspaceId).toBeDefined();

    // 3. Verify isolated worktree was provisioned on disk
    const workspace = repos.workspaces.findById(activeAssignment.workspaceId!)!;
    expect(existsSync(workspace.path)).toBe(true);
    expect(workspace.status).toBe("READY");

    // 4. Agent executes task inside isolated worktree
    const execution = await executionService.startExecution(activeTask.id, {
      writeToDisk: true,
      filesToGenerate: {
        "src/auth-token.ts": "export function validateToken(t: string): boolean { return t.length > 10; }\n"
      },
      autoCommit: true,
      commitMessage: "feat: implement token validator middleware"
    });

    expect(execution.committed).toBe(true);
    expect(execution.commitHash).toBeDefined();
    expect(existsSync(path.join(workspace.path, "src", "auth-token.ts"))).toBe(true);

    // 5. Run automated tests in worktree (automatically advances task to READY_FOR_REVIEW)
    const testResult = await executionService.executeTests(activeTask.id, {
      command: "node -e \"console.log('Unit tests passed: 100%')\""
    });
    expect(testResult.passed).toBe(true);

    // 6. ReviewOrchestrator initiates code review
    const review = await reviewOrchestrator.startReview({
      taskId: activeTask.id,
      reviewerId: "agent-arch-marcus"
    });

    expect(review.status).toBe("IN_PROGRESS");
    expect(review.commitHash).toBe(execution.commitHash);

    // 8. Architect submits clean review findings
    const reviewSubmission = await reviewOrchestrator.submitReview({
      reviewId: review.id,
      findings: [
        {
          file: "src/auth-token.ts",
          line: 1,
          severity: "INFO",
          category: "CORRECTNESS",
          message: "Clean functional implementation of token validation",
          recommendation: "Approved for production merge"
        }
      ],
      summary: "Code complies with architecture guidelines. All checks pass."
    });

    expect(reviewSubmission.status).toBe("APPROVED");

    // Task automatically advanced to APPROVAL state
    const taskInApproval = taskService.getTask(activeTask.id);
    expect(taskInApproval.status).toBe("APPROVAL");

    // 9. Create human merge approval bound to exact commit & diff hash
    const diff = await gitManager.getDiff(workspace.path, { baseCommit: "main" });
    const { createHash } = await import("crypto");
    const diffHash = createHash("sha256").update(diff).digest("hex");

    const mergeApproval = approvalService.createApproval({
      type: "MERGE",
      targetId: activeTask.id,
      targetRevision: taskInApproval.revision,
      targetCommit: execution.commitHash!,
      targetDiffHash: diffHash,
      requesterId: activeAssignment.agentId,
      reason: "Token validator feature is reviewed and tested, ready to merge into main"
    });

    expect(mergeApproval.status).toBe("PENDING");

    // 10. Human approves merge
    const approvedMerge = await approvalService.approve(mergeApproval.id, {
      approverId: "human-owner"
    });
    expect(approvedMerge.status).toBe("APPROVED");

    // 11. Dedicated MergeService executes merge into default branch
    const mergeOutcome = await mergeService.executeMerge({
      approvalId: mergeApproval.id,
      taskId: activeTask.id
    });

    expect(mergeOutcome.targetBranch).toBe("main");
    expect(mergeOutcome.mergeCommit).toBeDefined();
    expect(mergeOutcome.taskId).toBe(activeTask.id);

    // 12. Verify main branch on disk now has the merged file!
    expect(existsSync(path.join(testRepoDir, "src", "auth-token.ts"))).toBe(true);
    const contentOnMain = readFileSync(path.join(testRepoDir, "src", "auth-token.ts"), "utf-8");
    expect(contentOnMain).toContain("export function validateToken");

    // 13. Verify Task is DONE and Workspace is ARCHIVED
    const finalTask = taskService.getTask(activeTask.id);
    expect(finalTask.status).toBe("DONE");

    const finalWorkspace = repos.workspaces.findById(workspace.id)!;
    expect(finalWorkspace.status).toBe("ARCHIVED");

    // 14. Verify complete audit trail & event stream integrity
    const taskEvents = repos.events.getByStreamId(activeTask.id);
    expect(taskEvents.some((e) => e.type === "agent.diff")).toBe(true);
    expect(taskEvents.some((e) => e.type === "git.merged")).toBe(true);
    expect(taskEvents.some((e) => e.type === "task.transitioned" && (e.payload as any).nextStatus === "DONE")).toBe(true);

    const reviewEvents = repos.events.getByStreamId(review.id);
    expect(reviewEvents.some((e) => e.type === "review.started")).toBe(true);
    expect(reviewEvents.some((e) => e.type === "review.approved")).toBe(true);

    const auditLogs = repos.audit.findByEntity("TASK", activeTask.id);
    expect(auditLogs.some((a) => a.action === "task.assigned")).toBe(true);
    expect(auditLogs.some((a) => a.action === "task.executed")).toBe(true);
  });
});
