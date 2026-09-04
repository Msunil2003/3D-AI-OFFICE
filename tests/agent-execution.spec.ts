import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import * as path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { GitWorktreeManager } from "../packages/git-worktree/src/index";
import { RuntimeRegistry, MockRuntime, MOCK_CAPABILITIES } from "../packages/runtime-core/src/index";
import { TaskService } from "../apps/server/src/services/task-service";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";
import { AssignmentService } from "../apps/server/src/services/assignment-service";
import { AgentExecutionService } from "../apps/server/src/services/agent-execution-service";

test.describe("Phase 2D: Real Agent Execution & Isolated Worktree Integration", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let gitManager: GitWorktreeManager;
  let workspaceManager: WorkspaceManager;
  let taskService: TaskService;
  let assignmentService: AssignmentService;
  let runtimeRegistry: RuntimeRegistry;
  let executionService: AgentExecutionService;
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

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `exec-repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    execSync("git init -b main", { cwd: testRepoDir });
    execSync("git config user.name 'Execution Test'", { cwd: testRepoDir });
    execSync("git config user.email 'exec@aioffice.dev'", { cwd: testRepoDir });

    writeFileSync(path.join(testRepoDir, "README.md"), "# Test Project\n");
    execSync("git add README.md", { cwd: testRepoDir });
    execSync('git commit -m "Initial base commit"', { cwd: testRepoDir });

    repos.projects.create({
      id: "proj-1",
      name: "Core Backend",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    repos.agents.create({
      id: "agent-1",
      name: "Alex Dev",
      role: "BACKEND",
      department: "Core",
      skills: { typescript: 90, node: 85 },
      status: "available",
      summary: "Ready to code",
      desk: { x: 100, y: 100 },
      provider: "mock",
      lastSeen: new Date().toISOString()
    });
  });

  test.afterEach(() => {
    runtimeRegistry.clear();
    db.close();
    if (existsSync(testRepoDir)) {
      try {
        rmSync(testRepoDir, { recursive: true, force: true });
      } catch {
        // Non-fatal
      }
    }
  });

  test("executes task in isolated worktree, creates real files, computes real diff, and records events", async () => {
    // 1. Create and assign task
    const task = taskService.createTask({
      id: "task-101",
      projectId: "proj-1",
      title: "Add mockFeature helper",
      description: "Implement mockFeature in src/feature.ts",
      type: "FEATURE",
      priority: "HIGH"
    });

    await assignmentService.assignTask({
      taskId: "task-101",
      agentId: "agent-1",
      assignedBy: "manager"
    });

    const assignment = repos.assignments.findByTaskId("task-101")[0];
    expect(assignment).toBeDefined();
    expect(assignment.workspaceId).toBeDefined();

    const workspace = repos.workspaces.findById(assignment.workspaceId!)!;
    expect(workspace).toBeDefined();
    expect(existsSync(workspace.path)).toBe(true);

    // 2. Start execution
    const result = await executionService.startExecution("task-101", {
      writeToDisk: true,
      autoCommit: true,
      commitMessage: "feat(task-101): implement mockFeature"
    });

    // 3. Verify execution result
    expect(result.taskId).toBe("task-101");
    expect(result.agentId).toBe("agent-1");
    expect(result.committed).toBe(true);
    expect(result.commitHash).toBeDefined();
    expect(result.filesChanged).toContain("src/feature.ts");

    // 4. Verify file was written to disk inside the worktree
    const featurePath = path.join(workspace.path, "src", "feature.ts");
    expect(existsSync(featurePath)).toBe(true);
    const content = readFileSync(featurePath, "utf-8");
    expect(content).toContain("export function mockFeature()");

    // 5. Verify task transitioned to IN_PROGRESS
    const updatedTask = repos.tasks.findById("task-101")!;
    expect(updatedTask.status).toBe("IN_PROGRESS");

    // 6. Verify DIFF artifact was created
    const artifacts = repos.artifacts.findByTaskId("task-101");
    const diffArtifact = artifacts.find((a) => a.type === "DIFF");
    expect(diffArtifact).toBeDefined();
    expect(diffArtifact?.metadata?.filesChanged).toContain("src/feature.ts");

    // 7. Verify Events were captured in EventRepository
    const events = repos.events.getByStreamId("task-101");
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.type === "agent.diff")).toBe(true);

    // 8. Verify Audit log entry
    const auditLogs = repos.audit.findByEntity("TASK", "task-101");
    expect(auditLogs.some((l) => l.action === "task.executed")).toBe(true);
  });

  test("executes automated tests in worktree and transitions lifecycle on pass", async () => {
    // 1. Create and assign task
    const task = taskService.createTask({
      id: "task-102",
      projectId: "proj-1",
      title: "Write tested feature",
      type: "FEATURE"
    });

    await assignmentService.assignTask({
      taskId: "task-102",
      agentId: "agent-1",
      assignedBy: "manager"
    });

    const assignment = repos.assignments.findByTaskId("task-102")[0];
    const workspace = repos.workspaces.findById(assignment.workspaceId!)!;

    // 2. Start execution and write feature
    await executionService.startExecution("task-102", {
      writeToDisk: true,
      autoCommit: true
    });

    // 3. Create a passing test script in the worktree
    const testScript = path.join(workspace.path, "run-test.js");
    writeFileSync(
      testScript,
      `const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, 'src', 'feature.ts'), 'utf-8');
if (content.includes('export function mockFeature()')) {
  console.log('Feature verified successfully');
  process.exit(0);
} else {
  console.error('Feature missing');
  process.exit(1);
}
`
    );

    // 4. Run automated test via execution service
    const testResult = await executionService.executeTests("task-102", {
      command: `node "${testScript}"`
    });

    // 5. Verify test report
    expect(testResult.passed).toBe(true);
    expect(testResult.exitCode).toBe(0);
    expect(testResult.stdout).toContain("Feature verified successfully");
    expect(testResult.artifact.type).toBe("TEST_REPORT");

    // 6. Verify task transitioned to READY_FOR_REVIEW
    const updatedTask = repos.tasks.findById("task-102")!;
    expect(updatedTask.status).toBe("READY_FOR_REVIEW");

    // 7. Verify test completed event
    const events = repos.events.getByStreamId("task-102");
    expect(events.some((e) => e.type === "test.completed")).toBe(true);
  });

  test("handles test failure: marks task blocked without advancing to review", async () => {
    // 1. Create and assign task
    const task = taskService.createTask({
      id: "task-103",
      projectId: "proj-1",
      title: "Feature with failing test",
      type: "FEATURE"
    });

    await assignmentService.assignTask({
      taskId: "task-103",
      agentId: "agent-1",
      assignedBy: "manager"
    });

    const assignment = repos.assignments.findByTaskId("task-103")[0];
    const workspace = repos.workspaces.findById(assignment.workspaceId!)!;

    await executionService.startExecution("task-103", { writeToDisk: true });

    // 2. Create a failing test script in the worktree
    const failTestScript = path.join(workspace.path, "fail-test.js");
    writeFileSync(
      failTestScript,
      `console.error('AssertionError: expected true but got false');
process.exit(1);
`
    );

    // 3. Run automated test
    const testResult = await executionService.executeTests("task-103", {
      command: `node "${failTestScript}"`
    });

    // 4. Verify test failure
    expect(testResult.passed).toBe(false);
    expect(testResult.exitCode).toBe(1);
    expect(testResult.stderr).toContain("AssertionError");

    // 5. Verify task is BLOCKED and NOT in READY_FOR_REVIEW
    const updatedTask = repos.tasks.findById("task-103")!;
    expect(updatedTask.blocked).toBe(true);
    expect(updatedTask.blockedReason).toContain("Tests failed with exit code 1");
    expect(updatedTask.status).toBe("TESTING");
  });

  test("inspects task diff across worktree against base branch", async () => {
    const task = taskService.createTask({
      id: "task-104",
      projectId: "proj-1",
      title: "Diff inspection task",
      type: "FEATURE"
    });

    await assignmentService.assignTask({
      taskId: "task-104",
      agentId: "agent-1",
      assignedBy: "manager"
    });

    await executionService.startExecution("task-104", {
      writeToDisk: true,
      autoCommit: false
    });

    const diffResult = await executionService.getTaskDiff("task-104");
    expect(diffResult.hasChanges).toBe(true);
    expect(diffResult.diffText).toContain("export function mockFeature()");
    expect(diffResult.diffHash).toBeDefined();
    expect(diffResult.baseBranch).toBe("main");
  });

  test("crash recovery: preserves worktree and sets safe recovery state when runtime fails", async () => {
    const task = taskService.createTask({
      id: "task-105",
      projectId: "proj-1",
      title: "Crashing task",
      type: "FEATURE"
    });

    await assignmentService.assignTask({
      taskId: "task-105",
      agentId: "agent-1",
      assignedBy: "manager"
    });

    const assignment = repos.assignments.findByTaskId("task-105")[0];
    const workspace = repos.workspaces.findById(assignment.workspaceId!)!;

    // Create an uncommitted file to simulate in-flight work before crash
    const uncommittedFile = path.join(workspace.path, "scratch.txt");
    writeFileSync(uncommittedFile, "Important in-progress work that must not be deleted");

    // Attempt execution with failure
    await expect(
      executionService.startExecution("task-105", {
        failExecution: true
      })
    ).rejects.toThrow();

    // Verify worktree and uncommitted files were NOT deleted
    expect(existsSync(workspace.path)).toBe(true);
    expect(existsSync(uncommittedFile)).toBe(true);
    expect(readFileSync(uncommittedFile, "utf-8")).toBe("Important in-progress work that must not be deleted");

    // Verify task is marked blocked with failure reason
    const updatedTask = repos.tasks.findById("task-105")!;
    expect(updatedTask.blocked).toBe(true);
    expect(updatedTask.blockedReason).toContain("Execution failed");

    // Verify agent is in error status
    const updatedAgent = repos.agents.findById("agent-1")!;
    expect(updatedAgent.status).toBe("error");

    // Verify workspace preserved in DIRTY status because of uncommitted work
    const updatedWorkspace = repos.workspaces.findById(workspace.id)!;
    expect(updatedWorkspace.status).toBe("DIRTY");

    // Verify audit log captured the failure
    const auditLogs = repos.audit.findByEntity("TASK", "task-105");
    expect(auditLogs.some((l) => l.action === "execution.failed")).toBe(true);
  });
});
