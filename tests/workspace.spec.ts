import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import * as path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { GitWorktreeManager } from "../packages/git-worktree/src/index";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";

test.describe("Phase 2B: WorkspaceManager", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let gitManager: GitWorktreeManager;
  let workspaceManager: WorkspaceManager;
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

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `ws-repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    execSync("git init -b main", { cwd: testRepoDir });
    execSync("git config user.name 'Workspace Test'", { cwd: testRepoDir });
    execSync("git config user.email 'workspace@aioffice.dev'", { cwd: testRepoDir });

    writeFileSync(path.join(testRepoDir, "index.ts"), "console.log('Main app');\n");
    execSync("git add index.ts", { cwd: testRepoDir });
    execSync('git commit -m "Initial commit"', { cwd: testRepoDir });

    // Register project in DB
    repos.projects.create({
      id: "proj-test",
      name: "Workspace Test Repo",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Register agent
    repos.agents.create({
      id: "agent-alice",
      name: "Alice",
      role: "BACKEND",
      department: "Engineering",
      skills: {},
      status: "available",
      summary: "Ready",
      desk: { x: 0, y: 0 },
      provider: "opencode",
      lastSeen: new Date().toISOString()
    });
  });

  test.afterEach(() => {
    db.close();
    if (existsSync(testRepoDir)) {
      try {
        rmSync(testRepoDir, { recursive: true, force: true });
      } catch {
        // Non-fatal cleanup
      }
    }
  });

  test("allocates isolated workspace, creates branch, records audit and event", async () => {
    const ws = await workspaceManager.createWorkspace({
      projectId: "proj-test",
      taskId: "task-401",
      agentId: "agent-alice",
      agentSlug: "alice"
    });

    expect(ws.status).toBe("READY");
    expect(ws.branch).toBe("ai/task-401/alice");
    expect(existsSync(ws.path)).toBe(true);

    // Verify event emitted
    const events = repos.events.getByStreamId(ws.id);
    expect(events.some((e) => e.type === "workspace.created")).toBe(true);

    // Verify audit log
    const auditLogs = repos.audit.findByEntity("WORKSPACE", ws.id);
    expect(auditLogs.some((a) => a.action === "workspace.created")).toBe(true);
  });

  test("tracks dirty workspace state when files are modified", async () => {
    const ws = await workspaceManager.createWorkspace({
      projectId: "proj-test",
      taskId: "task-402",
      agentId: "agent-alice",
      agentSlug: "alice"
    });

    const cleanResult = await workspaceManager.getWorkspaceStatus(ws.id);
    expect(cleanResult.gitStatus.clean).toBe(true);
    expect(cleanResult.workspace.status).toBe("READY");

    // Modify file
    writeFileSync(path.join(ws.path, "new-file.ts"), "export const x = 1;\n");

    const dirtyResult = await workspaceManager.getWorkspaceStatus(ws.id);
    expect(dirtyResult.gitStatus.clean).toBe(false);
    expect(dirtyResult.workspace.status).toBe("DIRTY");
  });

  test("archives and removes workspace safely", async () => {
    const ws = await workspaceManager.createWorkspace({
      projectId: "proj-test",
      taskId: "task-403",
      agentId: "agent-alice",
      agentSlug: "alice"
    });

    const archived = workspaceManager.archiveWorkspace(ws.id);
    expect(archived.status).toBe("ARCHIVED");

    // Clean remove
    await workspaceManager.removeWorkspace(ws.id, { force: false });
    expect(existsSync(ws.path)).toBe(false);
  });

  test("reconciles missing physical worktrees to RECOVERY_REQUIRED", async () => {
    const ws = await workspaceManager.createWorkspace({
      projectId: "proj-test",
      taskId: "task-404",
      agentId: "agent-alice",
      agentSlug: "alice"
    });

    // Delete directory manually to simulate external failure or corrupted state
    rmSync(ws.path, { recursive: true, force: true });

    const reconcileResult = await workspaceManager.reconcileWorkspaces("proj-test");
    expect(reconcileResult.reconciled.some((r) => r.workspaceId === ws.id)).toBe(true);

    const updated = repos.workspaces.findById(ws.id);
    expect(updated?.status).toBe("RECOVERY_REQUIRED");
  });
});
