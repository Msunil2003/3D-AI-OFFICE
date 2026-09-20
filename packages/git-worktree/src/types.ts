export interface GitWorktreeInfo {
  path: string;
  head: string;
  branch: string;
  bare: boolean;
  locked: boolean;
  prunable?: string;
}

export interface GitStatusFile {
  path: string;
  status: "M" | "A" | "D" | "R" | "C" | "U" | "?";
  staged: boolean;
}

export interface GitStatusResult {
  clean: boolean;
  branch: string;
  ahead: number;
  behind: number;
  files: GitStatusFile[];
}

export interface GitConflictInfo {
  hasConflicts: boolean;
  conflictingFiles: string[];
}

export class GitSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitSecurityError";
  }
}

export class GitDirtyWorktreeError extends Error {
  constructor(public readonly worktreePath: string, public readonly uncommittedFiles: string[]) {
    super(`Cannot safely remove dirty worktree at '${worktreePath}'. Uncommitted changes: ${uncommittedFiles.join(", ")}`);
    this.name = "GitDirtyWorktreeError";
  }
}

export class GitExecutionError extends Error {
  constructor(public readonly command: string, public readonly exitCode: number, public readonly stderr: string) {
    super(`Git command failed [${command}]: ${stderr.trim()}`);
    this.name = "GitExecutionError";
  }
}

export class GitMergeConflictError extends Error {
  constructor(public readonly sourceBranch: string, public readonly targetBranch: string, public readonly details: string) {
    super(`Merge conflict between '${sourceBranch}' and '${targetBranch}': ${details}`);
    this.name = "GitMergeConflictError";
  }
}

