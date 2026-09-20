import { execFile } from "child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import * as path from "path";
import { promisify } from "util";
import {
  GitConflictInfo,
  GitDirtyWorktreeError,
  GitExecutionError,
  GitMergeConflictError,
  GitSecurityError,
  GitStatusFile,
  GitStatusResult,
  GitWorktreeInfo
} from "./types";

const execFileAsync = promisify(execFile);

export class GitWorktreeManager {
  /**
   * Execute git command using discrete arguments array (no shell interpolation)
   */
  private async runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execFileAsync("git", args, {
        cwd,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: {
          ...process.env,
          LC_ALL: "C", // Ensure predictable English output across systems
          GIT_TERMINAL_PROMPT: "0" // Never hang on credential prompt
        }
      });
      return { stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (err: any) {
      const code = typeof err.code === "number" ? err.code : 1;
      const stderr = err.stderr ? String(err.stderr) : String(err.message);
      throw new GitExecutionError(`git ${args.join(" ")}`, code, stderr);
    }
  }

  public assertPathInProject(repoRoot: string, targetPath: string): void {
    const resolvedRoot = path.resolve(repoRoot);
    const resolvedTarget = path.resolve(targetPath);
    if (!resolvedTarget.startsWith(resolvedRoot + path.sep) && resolvedTarget !== resolvedRoot) {
      throw new GitSecurityError(`Path traversal detected: target '${targetPath}' is outside repository root '${repoRoot}'`);
    }
  }

  public sanitizeBranchSlug(branch: string): string {
    const sanitized = branch.trim();
    if (!sanitized || !/^[a-zA-Z0-9_.\-\/]+$/.test(sanitized)) {
      throw new GitSecurityError(`Invalid branch name format: '${branch}'. Must contain only alphanumeric, '.', '-', '_', or '/' characters.`);
    }
    if (sanitized.includes("..") || sanitized.startsWith("/") || sanitized.endsWith("/")) {
      throw new GitSecurityError(`Unsafe branch name traversal: '${branch}'`);
    }
    return sanitized;
  }

  /**
   * Creates a dedicated worktree and branch for a task.
   */
  public async createWorktree(options: {
    repoPath: string;
    branch: string;
    worktreePath?: string;
    baseCommit?: string;
  }): Promise<{ worktreePath: string; branch: string }> {
    const repoPath = path.resolve(options.repoPath);
    const branch = this.sanitizeBranchSlug(options.branch);

    const worktreePath = options.worktreePath
      ? path.resolve(options.worktreePath)
      : path.join(repoPath, ".aioffice", "worktrees", branch.replace(/\//g, "-"));

    this.assertPathInProject(repoPath, worktreePath);

    if (existsSync(worktreePath)) {
      throw new Error(`Worktree path already exists: ${worktreePath}`);
    }

    const parentDir = path.dirname(worktreePath);
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    // Ensure .aioffice is ignored in the git repository exclude file
    try {
      const gitDir = path.join(repoPath, ".git");
      const infoDir = path.join(gitDir, "info");
      const excludeFile = path.join(infoDir, "exclude");
      if (!existsSync(infoDir)) {
        mkdirSync(infoDir, { recursive: true });
      }
      const existingExclude = existsSync(excludeFile) ? readFileSync(excludeFile, "utf-8") : "";
      if (!existingExclude.includes(".aioffice")) {
        appendFileSync(excludeFile, "\n.aioffice/\n.aioffice\n");
      }
    } catch {
      // Non-fatal
    }

    // Check if branch already exists
    let branchExists = false;
    try {
      await this.runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], repoPath);
      branchExists = true;
    } catch {
      branchExists = false;
    }

    // Prune any stale/missing worktree registrations before adding
    try {
      await this.runGit(["worktree", "prune"], repoPath);
    } catch {
      // Non-fatal
    }

    if (branchExists) {
      // Check out existing branch into new worktree (use -f if worktree registration lingered)
      try {
        await this.runGit(["worktree", "add", worktreePath, branch], repoPath);
      } catch (err: any) {
        if (String(err).includes("already registered")) {
          await this.runGit(["worktree", "add", "-f", worktreePath, branch], repoPath);
        } else {
          throw err;
        }
      }
    } else {
      // Create new branch at baseCommit (default HEAD) and check out into worktree
      const base = options.baseCommit || "HEAD";
      await this.runGit(["worktree", "add", "-b", branch, worktreePath, base], repoPath);
    }

    return { worktreePath, branch };
  }

  /**
   * Safely removes a worktree, checking for dirty/uncommitted files unless force is true.
   */
  public async removeWorktree(options: {
    repoPath: string;
    worktreePath: string;
    force?: boolean;
  }): Promise<void> {
    const repoPath = path.resolve(options.repoPath);
    const worktreePath = path.resolve(options.worktreePath);

    this.assertPathInProject(repoPath, worktreePath);

    if (existsSync(worktreePath)) {
      // Safety check: verify if worktree has uncommitted files
      if (!options.force) {
        const status = await this.getStatus(worktreePath);
        if (!status.clean) {
          const uncommitted = status.files.map((f) => `${f.status} ${f.path}`);
          throw new GitDirtyWorktreeError(worktreePath, uncommitted);
        }
      }

      const args = ["worktree", "remove"];
      if (options.force) args.push("--force");
      args.push(worktreePath);

      await this.runGit(args, repoPath);
    }

    // Prune stale worktree administrative references
    try {
      await this.runGit(["worktree", "prune"], repoPath);
    } catch {
      // Non-fatal
    }
  }

  /**
   * Lists all active worktrees for a repository.
   */
  public async listWorktrees(repoPath: string): Promise<GitWorktreeInfo[]> {
    const resolvedPath = path.resolve(repoPath);
    const { stdout } = await this.runGit(["worktree", "list", "--porcelain"], resolvedPath);

    const worktrees: GitWorktreeInfo[] = [];
    let current: Partial<GitWorktreeInfo> = {};

    const lines = stdout.split("\n");
    for (const line of lines) {
      if (!line.trim()) {
        if (current.path) {
          worktrees.push({
            path: current.path,
            head: current.head || "",
            branch: current.branch || "",
            bare: Boolean(current.bare),
            locked: Boolean(current.locked),
            prunable: current.prunable
          });
        }
        current = {};
        continue;
      }

      if (line.startsWith("worktree ")) {
        current.path = path.resolve(line.slice(9).trim());
      } else if (line.startsWith("HEAD ")) {
        current.head = line.slice(5).trim();
      } else if (line.startsWith("branch ")) {
        current.branch = line.slice(7).trim().replace(/^refs\/heads\//, "");
      } else if (line === "bare") {
        current.bare = true;
      } else if (line.startsWith("locked")) {
        current.locked = true;
      } else if (line.startsWith("prunable ")) {
        current.prunable = line.slice(9).trim();
      }
    }

    if (current.path) {
      worktrees.push({
        path: current.path,
        head: current.head || "",
        branch: current.branch || "",
        bare: Boolean(current.bare),
        locked: Boolean(current.locked),
        prunable: current.prunable
      });
    }

    return worktrees;
  }

  /**
   * Inspects working tree status (clean vs dirty, ahead/behind).
   */
  public async getStatus(worktreePath: string): Promise<GitStatusResult> {
    const resolvedPath = path.resolve(worktreePath);
    const { stdout } = await this.runGit(["status", "--porcelain=v1", "-b"], resolvedPath);

    const lines = stdout.split("\n").filter((l) => l.length > 0);
    let branch = "HEAD";
    let ahead = 0;
    let behind = 0;
    const files: GitStatusFile[] = [];

    for (const line of lines) {
      if (line.startsWith("## ")) {
        const branchLine = line.slice(3);
        const aheadMatch = branchLine.match(/ahead (\d+)/);
        const behindMatch = branchLine.match(/behind (\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
        if (behindMatch) behind = parseInt(behindMatch[1], 10);
        branch = branchLine.split("...")[0].trim();
        continue;
      }

      const x = line[0];
      const y = line[1];
      const filePath = line.slice(3).trim();

      // Ignore internal worktree workspace metadata directory
      if (filePath === ".aioffice" || filePath.startsWith(".aioffice/") || filePath.startsWith(".aioffice\\")) {
        continue;
      }

      if (x === "?" && y === "?") {
        files.push({ path: filePath, status: "?", staged: false });
      } else {
        if (x !== " " && x !== "?") {
          files.push({ path: filePath, status: x as any, staged: true });
        }
        if (y !== " " && y !== "?") {
          files.push({ path: filePath, status: y as any, staged: false });
        }
      }
    }

    return {
      clean: files.length === 0,
      branch,
      ahead,
      behind,
      files
    };
  }

  /**
   * Returns unified git diff.
   */
  public async getDiff(
    worktreePath: string,
    options?: { staged?: boolean; baseCommit?: string; includeUntracked?: boolean }
  ): Promise<string> {
    const resolvedPath = path.resolve(worktreePath);
    if (options?.includeUntracked) {
      try {
        await this.runGit(["add", "-N", "."], resolvedPath);
      } catch {
        // Non-fatal
      }
    }
    const args = ["diff"];
    if (options?.staged) args.push("--staged");
    if (options?.baseCommit) args.push(options.baseCommit);

    const { stdout } = await this.runGit(args, resolvedPath);
    return stdout;
  }

  /**
   * Returns current HEAD commit hash.
   */
  public async getCurrentCommit(worktreePath: string): Promise<string> {
    const resolvedPath = path.resolve(worktreePath);
    const { stdout } = await this.runGit(["rev-parse", "HEAD"], resolvedPath);
    return stdout;
  }

  /**
   * Stages and commits changes.
   */
  public async commit(worktreePath: string, message: string, options?: { stageAll?: boolean }): Promise<string> {
    const resolvedPath = path.resolve(worktreePath);
    if (options?.stageAll ?? true) {
      await this.runGit(["add", "-A"], resolvedPath);
    }

    await this.runGit(["commit", "-m", message], resolvedPath);
    return this.getCurrentCommit(resolvedPath);
  }

  /**
   * Checks for potential merge conflicts against targetBranch without altering working directory.
   */
  public async detectConflicts(worktreePath: string, targetBranch: string): Promise<GitConflictInfo> {
    const resolvedPath = path.resolve(worktreePath);
    const target = this.sanitizeBranchSlug(targetBranch);

    try {
      // Modern Git 2.38+ supports git merge-tree --write-tree
      const { stdout } = await this.runGit(["merge-tree", "--write-tree", "HEAD", target], resolvedPath);
      return { hasConflicts: false, conflictingFiles: [] };
    } catch (err: any) {
      // If exit code is 1, merge-tree detected conflict
      const stderr = err?.stderr || "";
      const stdout = err?.stdout || "";
      const output = `${stdout}\n${stderr}`;

      const conflictingFiles: string[] = [];
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes("CONFLICT") || line.includes("Auto-merging")) {
          const match = line.match(/(?:CONFLICT.*in|Auto-merging)\s+(.+)$/);
          if (match && !conflictingFiles.includes(match[1])) {
            conflictingFiles.push(match[1]);
          }
        }
      }

      return {
        hasConflicts: true,
        conflictingFiles: conflictingFiles.length > 0 ? conflictingFiles : ["Unknown conflict"]
      };
    }
  }

  /**
   * Merges a source branch into a target branch in the given repository.
   */
  public async mergeBranch(options: {
    repoPath: string;
    sourceBranch: string;
    targetBranch: string;
    message?: string;
    fastForwardOnly?: boolean;
  }): Promise<{ mergeCommit: string }> {
    const repoPath = path.resolve(options.repoPath);
    this.assertPathInProject(repoPath, repoPath);
    const source = this.sanitizeBranchSlug(options.sourceBranch);
    const target = this.sanitizeBranchSlug(options.targetBranch);

    // 1. Verify working directory at repoPath is clean
    const status = await this.getStatus(repoPath);
    if (!status.clean) {
      throw new GitDirtyWorktreeError(repoPath, status.files.map((f) => f.path));
    }

    // 2. Ensure repoPath is on targetBranch
    const { stdout: currentBranch } = await this.runGit(["rev-parse", "--abbrev-ref", "HEAD"], repoPath);
    if (currentBranch !== target) {
      await this.runGit(["checkout", target], repoPath);
    }

    // 3. Perform merge
    const message = options.message || `Merge branch '${source}' into '${target}'`;
    const args = ["merge", source, "-m", message];
    if (options.fastForwardOnly) {
      args.push("--ff-only");
    } else {
      args.push("--no-ff");
    }

    try {
      await this.runGit(args, repoPath);
    } catch (err: any) {
      try {
        await this.runGit(["merge", "--abort"], repoPath);
      } catch {
        // Non-fatal if merge wasn't in conflict state
      }
      throw new GitMergeConflictError(source, target, err.stderr || err.message);
    }

    // 4. Get the new merge commit hash
    const { stdout: mergeCommit } = await this.runGit(["rev-parse", "HEAD"], repoPath);
    return { mergeCommit };
  }
}

