import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import * as path from "path";
import {
  GitDirtyWorktreeError,
  GitSecurityError,
  GitWorktreeManager
} from "../packages/git-worktree/src/index";

test.describe("Phase 2B: GitWorktreeManager", () => {
  let manager: GitWorktreeManager;
  let testRepoDir: string;

  test.beforeEach(() => {
    manager = new GitWorktreeManager();
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    // Initialize clean Git repository with initial commit
    execSync("git init -b main", { cwd: testRepoDir });
    execSync("git config user.name 'Test Runner'", { cwd: testRepoDir });
    execSync("git config user.email 'test@aioffice.dev'", { cwd: testRepoDir });

    writeFileSync(path.join(testRepoDir, "README.md"), "# Test Project\nInitial commit.\n");
    execSync("git add README.md", { cwd: testRepoDir });
    execSync('git commit -m "Initial commit"', { cwd: testRepoDir });
  });

  test.afterEach(() => {
    if (existsSync(testRepoDir)) {
      try {
        rmSync(testRepoDir, { recursive: true, force: true });
      } catch {
        // Non-fatal cleanup
      }
    }
  });

  test("creates dedicated worktree and feature branch", async () => {
    const branch = "ai/task-101/alice";
    const result = await manager.createWorktree({
      repoPath: testRepoDir,
      branch
    });

    expect(existsSync(result.worktreePath)).toBe(true);
    expect(result.branch).toBe(branch);

    // Verify worktree list includes new worktree
    const list = await manager.listWorktrees(testRepoDir);
    expect(list.length).toBeGreaterThanOrEqual(2); // main repo + new worktree
    const created = list.find((w) => w.branch === branch);
    expect(created).toBeDefined();
    expect(created?.path).toBe(result.worktreePath);
  });

  test("tracks working tree status and detects modifications", async () => {
    const branch = "ai/task-102/bob";
    const { worktreePath } = await manager.createWorktree({
      repoPath: testRepoDir,
      branch
    });

    const initialStatus = await manager.getStatus(worktreePath);
    expect(initialStatus.clean).toBe(true);
    expect(initialStatus.files).toHaveLength(0);

    // Create a new file
    writeFileSync(path.join(worktreePath, "feature.ts"), "export const val = 42;\n");

    const modifiedStatus = await manager.getStatus(worktreePath);
    expect(modifiedStatus.clean).toBe(false);
    expect(modifiedStatus.files.some((f) => f.path.includes("feature.ts"))).toBe(true);
  });

  test("generates unified diff and commits changes", async () => {
    const branch = "ai/task-103/sarah";
    const { worktreePath } = await manager.createWorktree({
      repoPath: testRepoDir,
      branch
    });

    writeFileSync(path.join(worktreePath, "feature.ts"), "export const hello = 'world';\n");

    // Commit changes
    const commitHash = await manager.commit(worktreePath, "feat: add feature.ts");
    expect(commitHash).toMatch(/^[a-f0-9]{40}$/);

    const statusAfterCommit = await manager.getStatus(worktreePath);
    expect(statusAfterCommit.clean).toBe(true);

    // Modify file and check diff
    writeFileSync(path.join(worktreePath, "feature.ts"), "export const hello = 'universe';\n");
    const diff = await manager.getDiff(worktreePath);
    expect(diff).toContain("-export const hello = 'world';");
    expect(diff).toContain("+export const hello = 'universe';");
  });

  test("prevents deleting dirty worktree without force flag", async () => {
    const branch = "ai/task-104/dirty";
    const { worktreePath } = await manager.createWorktree({
      repoPath: testRepoDir,
      branch
    });

    writeFileSync(path.join(worktreePath, "uncommitted.txt"), "Important work\n");

    // Safe remove should throw GitDirtyWorktreeError
    await expect(
      manager.removeWorktree({
        repoPath: testRepoDir,
        worktreePath,
        force: false
      })
    ).rejects.toThrow(GitDirtyWorktreeError);

    expect(existsSync(worktreePath)).toBe(true);

    // Forced remove succeeds
    await manager.removeWorktree({
      repoPath: testRepoDir,
      worktreePath,
      force: true
    });

    expect(existsSync(worktreePath)).toBe(false);
  });

  test("security: rejects path traversal outside project root", async () => {
    const escapePath = path.resolve(testRepoDir, "..", "escaped-worktree");

    expect(() => {
      manager.assertPathInProject(testRepoDir, escapePath);
    }).toThrow(GitSecurityError);
  });

  test("security: sanitizes branch names and rejects injection characters", () => {
    expect(() => {
      manager.sanitizeBranchSlug("bad;rm -rf /");
    }).toThrow(GitSecurityError);

    expect(() => {
      manager.sanitizeBranchSlug("../evil-branch");
    }).toThrow(GitSecurityError);

    expect(manager.sanitizeBranchSlug("ai/task-101/alice")).toBe("ai/task-101/alice");
  });
});
