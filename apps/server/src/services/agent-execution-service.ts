import { randomUUID, createHash } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import {
  Task,
  Workspace,
  AgentEntity,
  Artifact,
  EventRecord,
  AuditLog
} from "@office/shared";
import {
  RuntimeRegistry,
  AgentRuntime,
  NormalizedAgentEvent
} from "@office/runtime-core";
import { GitWorktreeManager } from "@office/git-worktree";
import {
  TaskRepository,
  WorkspaceRepository,
  AgentRepository,
  AssignmentRepository,
  EventRepository,
  AuditRepository,
  ArtifactRepository,
  ProjectRepository
} from "../repositories/index";
import { TaskService } from "./task-service";
import { WorkspaceManager } from "./workspace-manager";

const execAsync = promisify(exec);

export interface ExecutionOptions {
  prompt?: string;
  filesToGenerate?: Record<string, string>;
  writeToDisk?: boolean;
  autoCommit?: boolean;
  commitMessage?: string;
  timeoutMs?: number;
  failExecution?: boolean;
}

export interface ExecutionResult {
  taskId: string;
  agentId: string;
  workspaceId: string;
  workspacePath: string;
  diff?: string;
  diffHash?: string;
  filesChanged: string[];
  committed: boolean;
  commitHash?: string;
}

export interface TestExecutionOptions {
  command?: string;
  timeoutMs?: number;
}

export interface TestExecutionResult {
  taskId: string;
  passed: boolean;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
  artifact: Artifact;
}

export interface TaskDiffResult {
  taskId: string;
  workspaceId: string;
  branch: string;
  baseBranch: string;
  diffText: string;
  diffHash: string;
  hasChanges: boolean;
  filesChanged: string[];
}

export class AgentExecutionService {
  constructor(
    private taskRepo: TaskRepository,
    private workspaceRepo: WorkspaceRepository,
    private agentRepo: AgentRepository,
    private assignmentRepo: AssignmentRepository,
    private projectRepo: ProjectRepository,
    private eventRepo: EventRepository,
    private auditRepo: AuditRepository,
    private artifactRepo: ArtifactRepository,
    private worktreeManager: GitWorktreeManager,
    private workspaceManager: WorkspaceManager,
    private taskService: TaskService,
    private runtimeRegistry: RuntimeRegistry
  ) {}

  /**
   * Execute task inside the assigned agent's isolated worktree.
   */
  async startExecution(taskId: string, options?: ExecutionOptions): Promise<ExecutionResult> {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }

    const assignments = this.assignmentRepo.findByTaskId(taskId);
    const assignment = assignments.find((a) => a.status === "ACTIVE");
    if (!assignment || !assignment.workspaceId) {
      throw new Error(`No active assignment with workspace found for task "${taskId}"`);
    }

    const agent = this.agentRepo.findById(assignment.agentId);
    if (!agent) {
      throw new Error(`Assigned agent "${assignment.agentId}" not found`);
    }

    const workspace = this.workspaceRepo.findById(assignment.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace "${assignment.workspaceId}" not found for task "${taskId}"`);
    }

    // Path check
    if (!existsSync(workspace.path)) {
      this.workspaceRepo.update(workspace.id, {
        status: "RECOVERY_REQUIRED"
      }, workspace.revision);
      this.taskRepo.update(taskId, {
        blocked: true,
        blockedReason: `Workspace path missing on disk: ${workspace.path}`
      }, task.revision);
      throw new Error(`Workspace directory missing on disk: ${workspace.path}`);
    }

    // Transition task to IN_PROGRESS if ASSIGNED or READY
    let currentTask = task;
    if (currentTask.status === "ASSIGNED" || currentTask.status === "READY") {
      currentTask = this.taskService.transitionTask(taskId, "IN_PROGRESS", currentTask.revision);
    }

    // Transition workspace to IN_USE if READY
    if (workspace.status === "READY") {
      this.workspaceRepo.update(workspace.id, {
        status: "IN_USE"
      }, workspace.revision);
    }

    // Mark agent working
    this.agentRepo.update(agent.id, { status: "working" });

    // Initialize or resolve runtime for this agent with workingDirectory = workspace.path
    let runtime = this.runtimeRegistry.getRuntime(agent.id);
    if (runtime && runtime.workingDirectory !== workspace.path) {
      await this.runtimeRegistry.removeRuntime(agent.id);
      runtime = undefined;
    }

    if (!runtime) {
      runtime = await this.runtimeRegistry.createRuntime({
        agentId: agent.id,
        name: agent.name,
        provider: agent.provider,
        workingDirectory: workspace.path,
        personality: `${agent.role} Engineer: ${agent.name}`,
        extra: {
          writeToDisk: options?.writeToDisk ?? true,
          files: options?.filesToGenerate,
          failExecution: options?.failExecution
        }
      });
    }

    // Subscribe to runtime events and route to EventRepository
    let runtimeError: Error | null = null;
    const unsubscribe = runtime.subscribe((event: NormalizedAgentEvent) => {
      if (event.kind === "agent.error") {
        runtimeError = new Error((event as any).message || "Agent runtime error");
      }
      try {
        this.eventRepo.append({
          eventId: randomUUID(),
          streamId: taskId,
          causationId: undefined,
          correlationId: taskId,
          producer: `agent:${agent.id}`,
          schemaVersion: "1.0",
          type: event.kind,
          payload: event as unknown as Record<string, unknown>,
          timestamp: event.timestamp || new Date().toISOString()
        });
      } catch (err) {
        console.error(`[AgentExecutionService] Failed to record runtime event:`, err);
      }
    });

    try {
      if (runtime.getStatus() === "idle") {
        await runtime.start({ autoIntro: false });
      }

      const prompt =
        options?.prompt ||
        `Task: ${currentTask.title}\nDescription: ${currentTask.description || "No description"}\nBranch: ${workspace.branch}`;

      await runtime.sendMessage(prompt, { channel: "task" });

      // Give runtime processing time (for mock / headless)
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (options?.failExecution) {
        throw new Error("Simulated execution failure");
      }
      if (runtimeError) {
        throw runtimeError;
      }
      if (runtime.getStatus() === "error") {
        throw new Error("Runtime entered error state");
      }

      // Inspect worktree for modifications
      const status = await this.worktreeManager.getStatus(workspace.path);
      const isDirty = !status.clean;
      let diffText = "";
      let diffHash = "";
      let filesChanged: string[] = status.files.map((f) => f.path);

      if (isDirty) {
        this.workspaceRepo.update(workspace.id, { status: "DIRTY" });
        diffText = await this.worktreeManager.getDiff(workspace.path, { includeUntracked: true });
        diffHash = createHash("sha256").update(diffText).digest("hex");
        const parsedFiles = this.parseFilesFromDiff(diffText);
        for (const file of parsedFiles) {
          if (!filesChanged.includes(file)) {
            filesChanged.push(file);
          }
        }

        // Store Diff Artifact
        this.artifactRepo.create({
          id: randomUUID(),
          type: "DIFF",
          projectId: currentTask.projectId,
          taskId: currentTask.id,
          storageType: "DIFF",
          uri: `task://${taskId}/diff-${Date.now()}`,
          contentHash: diffHash,
          metadata: {
            diffText,
            filesChanged
          },
          version: 1,
          createdAt: new Date().toISOString()
        });

        // Record diff event
        this.eventRepo.append({
          eventId: randomUUID(),
          streamId: taskId,
          causationId: undefined,
          correlationId: taskId,
          producer: `agent:${agent.id}`,
          schemaVersion: "1.0",
          type: "agent.diff",
          payload: {
            diffText,
            diffHash,
            filesChanged
          },
          timestamp: new Date().toISOString()
        });
      }

      let committed = false;
      let commitHash: string | undefined;

      if (options?.autoCommit && isDirty) {
        commitHash = await this.worktreeManager.commit(
          workspace.path,
          options.commitMessage || `feat(${taskId}): ${currentTask.title}`
        );
        committed = true;
        const project = this.projectRepo.findById(currentTask.projectId);
        const baseBranch = project?.defaultBranch || "main";
        diffText = await this.worktreeManager.getDiff(workspace.path, { baseCommit: baseBranch });
        diffHash = createHash("sha256").update(diffText).digest("hex");
      }

      // Record audit log
      this.auditRepo.append({
        id: randomUUID(),
        action: "task.executed",
        actorId: agent.id,
        entityType: "TASK",
        entityId: taskId,
        details: {
          committed,
          commitHash,
          diffHash,
          filesChanged
        },
        timestamp: new Date().toISOString()
      });

      return {
        taskId,
        agentId: agent.id,
        workspaceId: workspace.id,
        workspacePath: workspace.path,
        diff: diffText,
        diffHash,
        filesChanged,
        committed,
        commitHash
      };
    } catch (err: any) {
      // Crash / failure recovery: preserve worktree and mark task blocked
      this.eventRepo.append({
        eventId: randomUUID(),
        streamId: taskId,
        causationId: undefined,
        correlationId: taskId,
        producer: `agent-execution-service`,
        schemaVersion: "1.0",
        type: "agent.error",
        payload: {
          message: err?.message || "Unknown execution error",
          stack: err?.stack
        },
        timestamp: new Date().toISOString()
      });

      this.agentRepo.update(agent.id, { status: "error" });

      const latestTask = this.taskRepo.findById(taskId) || currentTask;
      this.taskRepo.update(taskId, {
        blocked: true,
        blockedReason: `Execution failed: ${err?.message || "Unknown error"}`
      }, latestTask.revision);

      const status = await this.worktreeManager.getStatus(workspace.path).catch(() => null);
      const isDirty = status ? !status.clean : false;
      const latestWs = this.workspaceRepo.findById(workspace.id) || workspace;
      this.workspaceRepo.update(workspace.id, {
        status: isDirty ? "DIRTY" : "RECOVERY_REQUIRED"
      }, latestWs.revision);

      this.auditRepo.append({
        id: randomUUID(),
        action: "execution.failed",
        actorId: agent.id,
        entityType: "TASK",
        entityId: taskId,
        details: { error: err?.message },
        timestamp: new Date().toISOString()
      });

      throw err;
    } finally {
      unsubscribe();
    }
  }

  /**
   * Execute automated tests inside the task's worktree.
   */
  async executeTests(taskId: string, options?: TestExecutionOptions): Promise<TestExecutionResult> {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }

    const assignments = this.assignmentRepo.findByTaskId(taskId);
    const assignment = assignments.find((a) => a.status === "ACTIVE");
    if (!assignment || !assignment.workspaceId) {
      throw new Error(`No active assignment found for task "${taskId}"`);
    }

    const workspace = this.workspaceRepo.findById(assignment.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace "${assignment.workspaceId}" not found for task "${taskId}"`);
    }

    // Transition task to TESTING
    let currentTask = task;
    if (currentTask.status !== "TESTING") {
      currentTask = this.taskService.transitionTask(taskId, "TESTING", currentTask.revision);
    }

    const command = options?.command || "npm test";
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let exitCode = 0;

    try {
      const res = await execAsync(command, {
        cwd: workspace.path,
        timeout: options?.timeoutMs || 30000
      });
      stdout = res.stdout;
      stderr = res.stderr;
      exitCode = 0;
    } catch (err: any) {
      stdout = err.stdout || "";
      stderr = err.stderr || err.message;
      exitCode = typeof err.code === "number" ? err.code : 1;
    }

    const durationMs = Date.now() - startTime;
    const passed = exitCode === 0;

    // Save test report artifact
    const artifact = this.artifactRepo.create({
      id: randomUUID(),
      type: "TEST_REPORT",
      projectId: currentTask.projectId,
      taskId: currentTask.id,
      storageType: "INLINE_JSON",
      uri: `task://${taskId}/test-report-${Date.now()}`,
      contentHash: createHash("sha256").update(stdout + stderr).digest("hex"),
      metadata: {
        command,
        passed,
        exitCode,
        durationMs,
        stdout: stdout.slice(0, 10000),
        stderr: stderr.slice(0, 10000)
      },
      version: 1,
      createdAt: new Date().toISOString()
    });

    // Record test completed event
    this.eventRepo.append({
      eventId: randomUUID(),
      streamId: taskId,
      causationId: undefined,
      correlationId: taskId,
      producer: "test-runner",
      schemaVersion: "1.0",
      type: "test.completed",
      payload: {
        passed,
        exitCode,
        durationMs,
        artifactId: artifact.id
      },
      timestamp: new Date().toISOString()
    });

    // Update task lifecycle state: if passed -> READY_FOR_REVIEW; if failed -> block task
    const latestTask = this.taskRepo.findById(taskId) || currentTask;
    if (passed) {
      this.taskService.transitionTask(taskId, "READY_FOR_REVIEW", latestTask.revision);
    } else {
      this.taskRepo.update(taskId, {
        blocked: true,
        blockedReason: `Tests failed with exit code ${exitCode}`
      }, latestTask.revision);
    }

    // Record audit log
    this.auditRepo.append({
      id: randomUUID(),
      action: "test.executed",
      actorId: "test-runner",
      entityType: "TASK",
      entityId: taskId,
      details: {
        passed,
        exitCode,
        durationMs,
        artifactId: artifact.id
      },
      timestamp: new Date().toISOString()
    });

    return {
      taskId,
      passed,
      exitCode,
      durationMs,
      stdout,
      stderr,
      artifact
    };
  }

  /**
   * Get unified diff of the worktree against base branch.
   */
  async getTaskDiff(taskId: string): Promise<TaskDiffResult> {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }

    const assignments = this.assignmentRepo.findByTaskId(taskId);
    const assignment = assignments.find((a) => a.status === "ACTIVE");
    if (!assignment || !assignment.workspaceId) {
      throw new Error(`No active assignment found for task "${taskId}"`);
    }

    const workspace = this.workspaceRepo.findById(assignment.workspaceId);
    if (!workspace) {
      throw new Error(`Workspace "${assignment.workspaceId}" not found for task "${taskId}"`);
    }

    const project = this.projectRepo.findById(task.projectId);
    const baseBranch = project?.defaultBranch || "main";

    const diffText = await this.worktreeManager.getDiff(workspace.path, {
      baseCommit: baseBranch,
      includeUntracked: true
    });
    const diffHash = createHash("sha256").update(diffText).digest("hex");
    const status = await this.worktreeManager.getStatus(workspace.path);
    const filesChanged = this.parseFilesFromDiff(diffText);
    for (const f of status.files) {
      if (!filesChanged.includes(f.path)) {
        filesChanged.push(f.path);
      }
    }

    return {
      taskId,
      workspaceId: workspace.id,
      branch: workspace.branch,
      baseBranch,
      diffText,
      diffHash,
      hasChanges: diffText.trim().length > 0,
      filesChanged
    };
  }

  /**
   * Abort task execution.
   */
  async abortExecution(taskId: string, reason?: string): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }

    const assignments = this.assignmentRepo.findByTaskId(taskId);
    const assignment = assignments.find((a) => a.status === "ACTIVE");
    if (assignment) {
      const runtime = this.runtimeRegistry.getRuntime(assignment.agentId);
      if (runtime) {
        await runtime.abort();
      }
      this.agentRepo.update(assignment.agentId, { status: "available" });
    }

    this.taskRepo.update(taskId, {
      blocked: true,
      blockedReason: reason || "Execution aborted"
    }, task.revision);

    this.auditRepo.append({
      id: randomUUID(),
      action: "execution.aborted",
      actorId: "user",
      entityType: "TASK",
      entityId: taskId,
      details: { reason: reason || "Aborted" },
      timestamp: new Date().toISOString()
    });
  }

  private parseFilesFromDiff(diffText: string): string[] {
    const files = new Set<string>();
    const lines = diffText.split("\n");
    for (const line of lines) {
      if (line.startsWith("diff --git a/")) {
        const parts = line.split(" ");
        if (parts.length >= 3) {
          const file = parts[2].replace(/^a\//, "");
          files.add(file);
        }
      }
    }
    return Array.from(files);
  }
}
