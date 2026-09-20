import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import * as path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { GitWorktreeManager } from "../packages/git-worktree/src/index";
import { TaskService } from "../apps/server/src/services/task-service";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";
import { ApprovalService } from "../apps/server/src/services/approval-service";
import {
  MergeService,
  UnauthorizedMergeError,
  MergeConflictError
} from "../apps/server/src/services/merge-service";

test.describe("Phase 2F: Git Merge Service", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let gitManager: GitWorktreeManager;
  let workspaceManager: WorkspaceManager;
  let taskService: TaskService;
  let approvalService: ApprovalService;
  let mergeService: MergeService;
  let testRepoDir: string;
  let projectId: string;

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
    approvalService = new ApprovalService(
      repos.approvals,
      repos.tasks,
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

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `merge-repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    execSync("git init -b main", { cwd: testRepoDir });
    execSync("git config user.name 'Merge Runner'", { cwd: testRepoDir });
    execSync("git config user.email 'merge@aioffice.dev'", { cwd: testRepoDir });

    writeFileSync(path.join(testRepoDir, "README.md"), "# Project Core\nBase commit\n");
    execSync("git add README.md", { cwd: testRepoDir });
    execSync('git commit -m "Initial commit for merge tests"', { cwd: testRepoDir });

    projectId = "proj-merge-test";
    const now = new Date().toISOString();
    repos.projects.create({
      id: projectId,
      name: "Merge Test Project",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: now,
      updatedAt: now
    });

    for (const agentId of ["agent-bob", "agent-dev", "agent-1"]) {
      repos.agents.create({
        id: agentId,
        name: `Agent ${agentId}`,
        role: "DEVELOPER",
        department: "Engineering",
        skills: { typescript: 4 },
        status: "available",
        summary: "Working",
        desk: { x: 1, y: 1 },
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

  test("rejects merge when approval is missing, pending, or for wrong task", async () => {
    const task = taskService.createTask({ projectId, title: "Add analytics" });
    const workspace = await workspaceManager.createWorkspace({ projectId, taskId: task.id });
    repos.tasks.update(task.id, { workspaceId: workspace.id, branch: workspace.branch });

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    taskService.transitionTask(task.id, "TESTING");
    taskService.transitionTask(task.id, "READY_FOR_REVIEW");
    taskService.transitionTask(task.id, "IN_REVIEW");
    taskService.transitionTask(task.id, "APPROVAL");

    // Unapproved pending approval
    const pendingApproval = approvalService.createApproval({
      type: "MERGE",
      targetId: task.id,
      targetRevision: 1,
      targetCommit: "c".repeat(40),
      targetDiffHash: "d".repeat(64),
      requesterId: "agent-1",
      reason: "Merge request"
    });

    await expect(
      mergeService.executeMerge({
        approvalId: pendingApproval.id,
        taskId: task.id
      })
    ).rejects.toThrow(UnauthorizedMergeError);
  });

  test("executes authorized merge, updates task to DONE, archives workspace, and records audit trail", async () => {
    const task = taskService.createTask({ projectId, title: "Add payment webhook" });
    const workspace = await workspaceManager.createWorkspace({
      projectId,
      taskId: task.id,
      agentId: "agent-bob",
      agentSlug: "bob"
    });
    repos.tasks.update(task.id, { workspaceId: workspace.id, branch: workspace.branch });

    // Developer writes code in worktree
    writeFileSync(path.join(workspace.path, "webhook.ts"), "export const handleWebhook = () => true;\n");
    const commitHash = await gitManager.commit(workspace.path, "feat: implement payment webhook");
    const diff = await gitManager.getDiff(workspace.path, { baseCommit: "main" });
    const { createHash } = await import("crypto");
    const diffHash = createHash("sha256").update(diff).digest("hex");

    // Lifecycle transitions to APPROVAL
    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    taskService.transitionTask(task.id, "TESTING");
    taskService.transitionTask(task.id, "READY_FOR_REVIEW");
    taskService.transitionTask(task.id, "IN_REVIEW");
    taskService.transitionTask(task.id, "APPROVAL");

    // Create and approve MERGE approval
    const approval = approvalService.createApproval({
      type: "MERGE",
      targetId: task.id,
      targetRevision: task.revision,
      targetCommit: commitHash,
      targetDiffHash: diffHash,
      requesterId: "agent-bob",
      reason: "Webhook feature tested and reviewed"
    });

    await approvalService.approve(approval.id, {
      approverId: "human-lead",
      decisionNotes: "Approved for production merge"
    });

    // Execute merge
    const result = await mergeService.executeMerge({
      approvalId: approval.id,
      taskId: task.id,
      commitMessage: "feat(payment): merge webhook into main"
    });

    expect(result.mergeCommit).toMatch(/^[a-f0-9]{40}$/);
    expect(result.taskId).toBe(task.id);
    expect(result.targetBranch).toBe("main");

    // Verify on-disk file was merged into main repository root
    const mergedFile = path.join(testRepoDir, "webhook.ts");
    expect(existsSync(mergedFile)).toBe(true);
    expect(readFileSync(mergedFile, "utf-8")).toContain("handleWebhook");

    // Verify task state is terminal DONE
    const completedTask = taskService.getTask(task.id);
    expect(completedTask.status).toBe("DONE");
    expect(completedTask.completedAt).toBeDefined();

    // Verify workspace was archived
    const updatedWs = repos.workspaces.findById(workspace.id);
    expect(updatedWs?.status).toBe("ARCHIVED");

    // Verify ledgers
    const taskEvents = repos.events.getByStreamId(task.id);
    expect(taskEvents.some((e) => e.type === "git.merged")).toBe(true);
    expect(taskEvents.some((e) => e.type === "task.completed")).toBe(true);

    const audits = repos.audit.findByEntity("MERGE", task.id);
    expect(audits.length).toBeGreaterThan(0);
    expect(audits[0].action).toBe("merge.executed");
  });

  test("detects merge conflicts and aborts merge safely without corrupting main", async () => {
    const task = taskService.createTask({ projectId, title: "Update README" });
    const workspace = await workspaceManager.createWorkspace({ projectId, taskId: task.id });
    repos.tasks.update(task.id, { workspaceId: workspace.id, branch: workspace.branch });

    // Modify README in worktree
    writeFileSync(path.join(workspace.path, "README.md"), "# Conflicting Feature Header\n");
    const commitHash = await gitManager.commit(workspace.path, "feat: update readme in feature");
    const diff = await gitManager.getDiff(workspace.path, { baseCommit: "main" });
    const { createHash } = await import("crypto");
    const diffHash = createHash("sha256").update(diff).digest("hex");

    taskService.transitionTask(task.id, "ASSIGNED");
    taskService.transitionTask(task.id, "IN_PROGRESS");
    taskService.transitionTask(task.id, "TESTING");
    taskService.transitionTask(task.id, "READY_FOR_REVIEW");
    taskService.transitionTask(task.id, "IN_REVIEW");
    taskService.transitionTask(task.id, "APPROVAL");

    const approval = approvalService.createApproval({
      type: "MERGE",
      targetId: task.id,
      targetRevision: task.revision,
      targetCommit: commitHash,
      targetDiffHash: diffHash,
      requesterId: "agent-dev",
      reason: "Ready to merge"
    });

    await approvalService.approve(approval.id, {
      approverId: "human-lead"
    });

    // Meanwhile, after approval is granted, a conflicting commit lands on main!
    writeFileSync(path.join(testRepoDir, "README.md"), "# Conflicting Main Header\n");
    execSync("git add README.md", { cwd: testRepoDir });
    execSync('git commit -m "chore: conflicting commit on main"', { cwd: testRepoDir });

    // Execute merge should fail with MergeConflictError
    await expect(
      mergeService.executeMerge({
        approvalId: approval.id,
        taskId: task.id
      })
    ).rejects.toThrow(MergeConflictError);

    // Verify main branch was NOT corrupted
    const mainContent = readFileSync(path.join(testRepoDir, "README.md"), "utf-8");
    expect(mainContent).toContain("Conflicting Main Header");

    // Task is not marked DONE
    const taskAfter = taskService.getTask(task.id);
    expect(taskAfter.status).not.toBe("DONE");
  });
});
