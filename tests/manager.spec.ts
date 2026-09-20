import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import * as path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { GitWorktreeManager } from "../packages/git-worktree/src/index";
import { TaskService } from "../apps/server/src/services/task-service";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";
import { AssignmentService } from "../apps/server/src/services/assignment-service";
import { AgentCandidateScorer } from "../apps/server/src/services/agent-scorer";
import { PlanningService, PlanValidationError, InvalidPlanDependencyError } from "../apps/server/src/services/planning-service";
import { ProgressMonitor } from "../apps/server/src/services/progress-monitor";
import { ManagerService } from "../apps/server/src/services/manager-service";

test.describe("Phase 2E: AI Manager & Tech Lead Orchestration", () => {
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
  let testRepoDir: string;

  test.beforeEach(() => {
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

    progressMonitor = new ProgressMonitor(
      repos.projects,
      repos.tasks,
      repos.assignments,
      repos.agents
    );

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

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `mgr-repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    execSync("git init -b main", { cwd: testRepoDir });
    execSync("git config user.name 'Manager Test'", { cwd: testRepoDir });
    execSync("git config user.email 'manager@aioffice.dev'", { cwd: testRepoDir });

    writeFileSync(path.join(testRepoDir, "package.json"), '{\n  "name": "core-org"\n}\n');
    execSync("git add package.json", { cwd: testRepoDir });
    execSync('git commit -m "Initial commit for manager test"', { cwd: testRepoDir });

    repos.projects.create({
      id: "proj-mgr",
      name: "Core Infrastructure",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Seed diverse engineering staff
    repos.agents.create({
      id: "agent-lead",
      name: "Morgan Lead",
      role: "LEAD",
      department: "Core",
      skills: { architecture: 95, typescript: 90, leadership: 95 },
      status: "available",
      summary: "Ready to review or design",
      desk: { x: 50, y: 50 },
      provider: "mock",
      lastSeen: new Date().toISOString()
    });

    repos.agents.create({
      id: "agent-backend",
      name: "Riley Backend",
      role: "BACKEND",
      department: "Core",
      skills: { node: 95, typescript: 90, sql: 90 },
      status: "available",
      summary: "Ready to code backend",
      desk: { x: 100, y: 100 },
      provider: "mock",
      lastSeen: new Date().toISOString()
    });

    repos.agents.create({
      id: "agent-qa",
      name: "Sam QA",
      role: "QA",
      department: "Quality",
      skills: { testing: 95, playwright: 90, typescript: 80 },
      status: "available",
      summary: "Ready to test",
      desk: { x: 150, y: 150 },
      provider: "mock",
      lastSeen: new Date().toISOString()
    });
  });

  test.afterEach(() => {
    db.close();
    if (existsSync(testRepoDir)) {
      try {
        rmSync(testRepoDir, { recursive: true, force: true });
      } catch {
        // Non-fatal
      }
    }
  });

  test("creates structured plan, persists artifact, and binds human approval gate", async () => {
    const { plan, approval, artifact } = await managerService.createPlan({
      projectId: "proj-mgr",
      goal: "Implement authentication and rate limiting",
      architecturalSummary: "JWT-based authentication with token bucket rate limiting",
      tasks: [
        {
          tempId: "auth-core",
          title: "JWT Authentication Middleware",
          description: "Verify tokens and attach user identity",
          type: "FEATURE",
          priority: "HIGH",
          requiredRole: "BACKEND",
          requiredSkills: ["node", "typescript"],
          dependencies: [],
          estimatedComplexity: 3,
          riskLevel: "MEDIUM",
          acceptanceCriteria: ["Valid tokens pass", "Expired tokens return 401"]
        },
        {
          tempId: "rate-limit",
          title: "Rate Limiting Middleware",
          description: "Limit requests per IP",
          type: "FEATURE",
          priority: "HIGH",
          requiredRole: "BACKEND",
          requiredSkills: ["node", "sql"],
          dependencies: ["auth-core"],
          estimatedComplexity: 2,
          riskLevel: "LOW",
          acceptanceCriteria: ["Exceeding quota returns 429"]
        }
      ]
    });

    // Verify Plan
    expect(plan.id).toBeDefined();
    expect(plan.projectId).toBe("proj-mgr");
    expect(plan.tasks.length).toBe(2);

    // Verify Artifact in SQLite
    expect(artifact.type).toBe("PLAN");
    expect(artifact.storageType).toBe("INLINE_JSON");
    expect(artifact.contentHash).toBeDefined();
    const storedArtifact = repos.artifacts.findById(plan.id);
    expect(storedArtifact).toBeDefined();

    // Verify Approval gate
    expect(approval.type).toBe("PLAN_EXECUTION");
    expect(approval.status).toBe("PENDING");
    expect(approval.targetId).toBe(artifact.id);
    expect(approval.targetDiffHash).toBe(artifact.contentHash);
    expect(approval.targetCommit).toBeDefined();

    // Verify Event & Audit
    const events = repos.events.getByStreamId(plan.id);
    expect(events.some((e) => e.type === "plan.created")).toBe(true);

    const auditLogs = repos.audit.findByEntity("PROJECT", "proj-mgr");
    expect(auditLogs.some((l) => l.action === "plan.created")).toBe(true);
  });

  test("rejects malformed untrusted LLM plan outputs (Zod guard)", async () => {
    await expect(
      managerService.createPlan({
        projectId: "proj-mgr",
        goal: "Invalid plan",
        tasks: [
          {
            tempId: "t1",
            title: "", // Empty title violates min(1)
            description: "Missing valid title",
            type: "FEATURE",
            priority: "HIGH",
            requiredRole: "BACKEND",
            requiredSkills: [],
            dependencies: [],
            estimatedComplexity: 3,
            riskLevel: "LOW",
            acceptanceCriteria: []
          }
        ]
      })
    ).rejects.toThrow(PlanValidationError);

    // Verify zero artifacts created
    const artifacts = repos.artifacts.findByProjectId("proj-mgr");
    expect(artifacts.length).toBe(0);
  });

  test("detects and rejects cyclic and missing dependencies in plan DAG", async () => {
    // 1. Missing dependency reference
    await expect(
      managerService.createPlan({
        projectId: "proj-mgr",
        goal: "Missing dep",
        tasks: [
          {
            tempId: "t1",
            title: "Task 1",
            description: "Depends on non-existent t99",
            type: "FEATURE",
            priority: "HIGH",
            requiredRole: "BACKEND",
            requiredSkills: [],
            dependencies: ["t99"],
            estimatedComplexity: 2,
            riskLevel: "LOW",
            acceptanceCriteria: []
          }
        ]
      })
    ).rejects.toThrow(InvalidPlanDependencyError);

    // 2. Cyclic dependency
    await expect(
      managerService.createPlan({
        projectId: "proj-mgr",
        goal: "Cyclic dep",
        tasks: [
          {
            tempId: "t1",
            title: "Task 1",
            description: "Depends on t2",
            type: "FEATURE",
            priority: "HIGH",
            requiredRole: "BACKEND",
            requiredSkills: [],
            dependencies: ["t2"],
            estimatedComplexity: 2,
            riskLevel: "LOW",
            acceptanceCriteria: []
          },
          {
            tempId: "t2",
            title: "Task 2",
            description: "Depends on t1",
            type: "FEATURE",
            priority: "HIGH",
            requiredRole: "BACKEND",
            requiredSkills: [],
            dependencies: ["t1"],
            estimatedComplexity: 2,
            riskLevel: "LOW",
            acceptanceCriteria: []
          }
        ]
      })
    ).rejects.toThrow(InvalidPlanDependencyError);
  });

  test("ranks agent candidates for each planned task", async () => {
    const { plan } = await managerService.createPlan({
      projectId: "proj-mgr",
      goal: "Setup full stack features"
    });

    const planDetails = managerService.getPlan(plan.id);
    expect(planDetails.candidateRecommendations).toBeDefined();

    // t1 is BACKEND -> Riley Backend should be top candidate
    const t1Scores = planDetails.candidateRecommendations["t1"];
    expect(t1Scores.length).toBeGreaterThanOrEqual(3);
    expect(t1Scores[0].agent.id).toBe("agent-backend");

    // t2 is QA -> Sam QA should be top candidate
    const t2Scores = planDetails.candidateRecommendations["t2"];
    expect(t2Scores.length).toBeGreaterThanOrEqual(3);
    expect(t2Scores[0].agent.id).toBe("agent-qa");
  });

  test("human approval gate: approves plan, decomposes into tasks and provisions worktrees", async () => {
    const { plan, approval } = await managerService.createPlan({
      projectId: "proj-mgr",
      goal: "Implement caching layer",
      tasks: [
        {
          tempId: "cache-store",
          title: "In-memory cache store",
          description: "Key-value store with TTL",
          type: "FEATURE",
          priority: "HIGH",
          requiredRole: "BACKEND",
          requiredSkills: ["node", "typescript"],
          dependencies: [],
          estimatedComplexity: 3,
          riskLevel: "LOW",
          acceptanceCriteria: ["Get and set works", "TTL expiration works"]
        },
        {
          tempId: "cache-test",
          title: "Integration tests for cache store",
          description: "Verify cache eviction and concurrency",
          type: "TEST",
          priority: "HIGH",
          requiredRole: "QA",
          requiredSkills: ["testing", "typescript"],
          dependencies: ["cache-store"],
          estimatedComplexity: 2,
          riskLevel: "LOW",
          acceptanceCriteria: ["Concurrency tests pass"]
        }
      ]
    });

    // Approve the plan
    const approvalResult = await managerService.approvePlan(plan.id, {
      approverId: "alice-manager",
      autoAssign: true
    });

    expect(approvalResult.approved).toBe(true);
    expect(approvalResult.approval.status).toBe("APPROVED");
    expect(approvalResult.approval.approverId).toBe("alice-manager");
    expect(approvalResult.tasks.length).toBe(2);
    expect(approvalResult.assignments.length).toBe(2);

    // Verify tasks in SQLite
    const tasks = repos.tasks.findByProjectId("proj-mgr");
    expect(tasks.length).toBe(2);
    const storeTask = tasks.find((t) => t.title.includes("In-memory cache store"))!;
    const testTask = tasks.find((t) => t.title.includes("Integration tests"))!;
    expect(storeTask).toBeDefined();
    expect(testTask).toBeDefined();

    // Verify dependency in TaskRepository
    const deps = repos.tasks.getDependencies(testTask.id);
    expect(deps.some((d) => d.dependsOnTaskId === storeTask.id)).toBe(true);

    // Verify assignments and isolated worktrees were created
    const assignments = repos.assignments.findByTaskId(storeTask.id);
    expect(assignments[0].agentId).toBe("agent-backend");
    expect(assignments[0].workspaceId).toBeDefined();

    const workspace = repos.workspaces.findById(assignments[0].workspaceId!)!;
    expect(workspace).toBeDefined();
    expect(existsSync(workspace.path)).toBe(true);

    // Idempotency: re-approving returns existing tasks without duplicates
    const reApprove = await managerService.approvePlan(plan.id);
    expect(reApprove.approved).toBe(true);
    expect(repos.tasks.findByProjectId("proj-mgr").length).toBe(2);
  });

  test("human rejection gate: rejects plan with zero repository mutations", async () => {
    const { plan } = await managerService.createPlan({
      projectId: "proj-mgr",
      goal: "Risky architectural rewrite"
    });

    const rejectResult = managerService.rejectPlan(plan.id, {
      approverId: "lead-architect",
      reason: "Proposed architecture does not align with roadmap"
    });

    expect(rejectResult.rejected).toBe(true);
    expect(rejectResult.approval.status).toBe("REJECTED");
    expect(rejectResult.approval.decisionNotes).toContain("does not align");

    // Verify zero tasks were created
    const tasks = repos.tasks.findByProjectId("proj-mgr");
    expect(tasks.length).toBe(0);

    // Verify rejection audit log
    const auditLogs = repos.audit.findByEntity("APPROVAL", rejectResult.approval.id);
    expect(auditLogs.some((l) => l.action === "plan.rejected")).toBe(true);
  });

  test("progress monitor tracks task statuses, blocked conditions, and bottlenecks", async () => {
    // Create 3 tasks with various statuses and blocked states
    const t1 = taskService.createTask({
      projectId: "proj-mgr",
      title: "Task 1 (Ready)",
      type: "FEATURE"
    });

    const t2 = taskService.createTask({
      id: "task-blocked",
      projectId: "proj-mgr",
      title: "Task 2 (Blocked)",
      type: "FEATURE"
    });
    taskService.setBlocked("task-blocked", "Waiting on external API credentials", "external-team");

    const t3 = taskService.createTask({
      projectId: "proj-mgr",
      title: "Task 3 (Done)",
      type: "FEATURE"
    });
    taskService.transitionTask(t3.id, "ASSIGNED", t3.revision);
    taskService.transitionTask(t3.id, "IN_PROGRESS", 2);
    taskService.transitionTask(t3.id, "TESTING", 3);
    taskService.transitionTask(t3.id, "READY_FOR_REVIEW", 4);
    taskService.transitionTask(t3.id, "IN_REVIEW", 5);
    taskService.transitionTask(t3.id, "APPROVAL", 6);
    taskService.transitionTask(t3.id, "READY_FOR_MERGE", 7);
    taskService.transitionTask(t3.id, "DONE", 8);

    const report = managerService.getProgressReport("proj-mgr");
    expect(report.totalTasks).toBe(3);
    expect(report.completedTasks).toBe(1);
    expect(report.percentComplete).toBe(33);
    expect(report.statusCounts.READY).toBe(2);
    expect(report.statusCounts.DONE).toBe(1);

    expect(report.blockedTasks.length).toBe(1);
    expect(report.blockedTasks[0].blockedReason).toContain("credentials");
    expect(report.bottlenecks.some((b) => b.includes("blocked"))).toBe(true);
  });
});
