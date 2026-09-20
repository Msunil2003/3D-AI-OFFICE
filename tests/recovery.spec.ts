import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { GitWorktreeManager } from "@office/git-worktree";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";
import { TaskService } from "../apps/server/src/services/task-service";
import { ReconciliationService } from "../apps/server/src/services/reconciliation-service";

test.describe("Phase 2J: Startup Reconciliation & Crash Recovery", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let gitManager: GitWorktreeManager;
  let workspaceManager: WorkspaceManager;
  let taskService: TaskService;
  let reconciliationService: ReconciliationService;
  let testRepoDir: string;
  let projectId: string;
  let agentId: string;

  test.beforeEach(async () => {
    db = createInMemoryDb();
    runMigrations(db);
    repos = createRepositories(db);

    testRepoDir = path.resolve(process.cwd(), `test-recovery-repo-${Date.now()}`);
    mkdirSync(testRepoDir, { recursive: true });
    execSync("git init -b main", { cwd: testRepoDir });
    execSync('git config user.name "Test Runner"', { cwd: testRepoDir });
    execSync('git config user.email "test@example.com"', { cwd: testRepoDir });
    writeFileSync(path.join(testRepoDir, "README.md"), "# Recovery Test Repo\n");
    execSync("git add README.md", { cwd: testRepoDir });
    execSync('git commit -m "initial commit"', { cwd: testRepoDir });

    gitManager = new GitWorktreeManager({ baseWorktreeDir: path.join(testRepoDir, ".aioffice", "worktrees") });
    workspaceManager = new WorkspaceManager(
      repos.workspaces,
      repos.projects,
      gitManager,
      repos.events,
      repos.audit
    );
    taskService = new TaskService(repos.tasks, repos.events, repos.audit);

    projectId = "proj-recovery-1";
    const now = new Date().toISOString();
    repos.projects.create({
      id: projectId,
      name: "Recovery Project",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: now,
      updatedAt: now
    });

    agentId = "agent-rec-1";
    repos.agents.create({
      id: agentId,
      name: "Recovery Agent",
      role: "DEVELOPER",
      department: "Engineering",
      skills: { typescript: 4 },
      status: "working",
      summary: "Simulating crash",
      desk: { x: 1, y: 1 },
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

  test("detects missing worktree directory on startup and transitions workspace to RECOVERY_REQUIRED", async () => {
    const task = taskService.createTask({ projectId, title: "Task for missing ws" });
    const ws = await workspaceManager.createWorkspace({
      projectId,
      taskId: task.id,
      agentId,
      agentSlug: "alice"
    });

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    repos.tasks.update(task.id, { workspaceId: ws.id });

    // Simulate crash / disk loss: delete the worktree directory from disk
    rmSync(ws.path, { recursive: true, force: true });
    expect(existsSync(ws.path)).toBe(false);

    // Initialize ReconciliationService with live runtime checker returning true
    reconciliationService = new ReconciliationService(
      repos.workspaces,
      repos.tasks,
      repos.projects,
      repos.events,
      repos.audit,
      gitManager,
      () => true
    );

    const report = await reconciliationService.reconcileAll();
    expect(report.corruptedWorkspaces).toContain(ws.id);
    expect(report.blockedTasks).toContain(task.id);

    // Verify workspace status is updated
    const updatedWs = repos.workspaces.findById(ws.id);
    expect(updatedWs?.status).toBe("RECOVERY_REQUIRED");

    // Verify task is blocked
    const updatedTask = repos.tasks.findById(task.id);
    expect(updatedTask?.blocked).toBe(true);
    expect(updatedTask?.blockedReason).toContain("requires recovery");

    // Verify ledger events
    const wsEvents = repos.events.getByStreamId(ws.id);
    expect(wsEvents.some((e) => e.type === "workspace.recovery_required")).toBe(true);
  });

  test("blocks task when agent runtime session is lost", async () => {
    const task = taskService.createTask({ projectId, title: "Task with dying runtime" });
    const ws = await workspaceManager.createWorkspace({
      projectId,
      taskId: task.id,
      agentId,
      agentSlug: "bob"
    });

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    repos.tasks.update(task.id, { workspaceId: ws.id, assigneeId: agentId });

    // Runtime checker reports agent runtime is dead
    reconciliationService = new ReconciliationService(
      repos.workspaces,
      repos.tasks,
      repos.projects,
      repos.events,
      repos.audit,
      gitManager,
      (id) => (id === agentId ? false : true) // agent runtime is dead
    );

    const report = await reconciliationService.reconcileAll();
    expect(report.blockedTasks).toContain(task.id);

    const updatedTask = repos.tasks.findById(task.id);
    expect(updatedTask?.blocked).toBe(true);
    expect(updatedTask?.blockedReason).toContain("session lost");
  });

  test("recovers workspace by reconstructing worktree from branch", async () => {
    const task = taskService.createTask({ projectId, title: "Task to recover" });
    const ws = await workspaceManager.createWorkspace({
      projectId,
      taskId: task.id,
      agentId,
      agentSlug: "charlie"
    });

    // Make a commit on the branch
    writeFileSync(path.join(ws.path, "code.ts"), "export const a = 1;\n");
    await gitManager.commit(ws.path, "feat: commit before crash");

    // Simulate worktree deletion
    rmSync(ws.path, { recursive: true, force: true });
    repos.workspaces.update(ws.id, { status: "RECOVERY_REQUIRED" });

    reconciliationService = new ReconciliationService(
      repos.workspaces,
      repos.tasks,
      repos.projects,
      repos.events,
      repos.audit,
      gitManager
    );

    const recovered = await reconciliationService.recoverWorkspace(ws.id);
    expect(recovered.status).toBe("READY");
    expect(existsSync(recovered.path)).toBe(true);

    // Verify recovery event
    const events = repos.events.getByStreamId(ws.id);
    expect(events.some((e) => e.type === "workspace.recovered")).toBe(true);
  });
});
