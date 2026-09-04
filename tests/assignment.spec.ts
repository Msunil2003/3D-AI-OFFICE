import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import * as path from "path";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";
import { GitWorktreeManager } from "../packages/git-worktree/src/index";
import { AgentCandidateScorer } from "../apps/server/src/services/agent-scorer";
import { AssignmentService } from "../apps/server/src/services/assignment-service";
import { WorkspaceManager } from "../apps/server/src/services/workspace-manager";

test.describe("Phase 2C: Agent Candidate Scorer & Assignment Service", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;
  let gitManager: GitWorktreeManager;
  let workspaceManager: WorkspaceManager;
  let assignmentService: AssignmentService;
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
    assignmentService = new AssignmentService(
      repos.tasks,
      repos.agents,
      repos.assignments,
      workspaceManager,
      repos.events,
      repos.audit
    );

    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    testRepoDir = path.resolve(process.cwd(), "data", "test-scratch", `asgn-repo-${timestamp}`);
    mkdirSync(testRepoDir, { recursive: true });

    execSync("git init -b main", { cwd: testRepoDir });
    execSync("git config user.name 'Assignment Test'", { cwd: testRepoDir });
    execSync("git config user.email 'assignment@aioffice.dev'", { cwd: testRepoDir });

    writeFileSync(path.join(testRepoDir, "index.ts"), "console.log('Base');\n");
    execSync("git add index.ts", { cwd: testRepoDir });
    execSync('git commit -m "Initial commit"', { cwd: testRepoDir });

    repos.projects.create({
      id: "proj-1",
      name: "Core App",
      localPath: testRepoDir,
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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

  test("AgentCandidateScorer deterministically ranks agents based on role, skills, availability and workload", () => {
    const scorer = new AgentCandidateScorer();

    const alice = repos.agents.create({
      id: "agent-alice",
      name: "Alice Backend",
      role: "BACKEND",
      skills: { sql: 5, postgres: 5, typescript: 4 },
      status: "available",
      lastSeen: new Date().toISOString()
    });

    const bob = repos.agents.create({
      id: "agent-bob",
      name: "Bob Frontend",
      role: "FRONTEND",
      skills: { react: 5, css: 5 },
      status: "available",
      lastSeen: new Date().toISOString()
    });

    const task = repos.tasks.create({
      id: "task-sql",
      projectId: "proj-1",
      title: "Optimize SQL Queries and Indexes",
      description: "Needs strong Postgres and SQL skills",
      type: "TECHNICAL_TASK",
      status: "READY",
      acceptanceCriteria: [],
      testCriteria: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const scores = scorer.scoreCandidates(task, [alice, bob], []);
    expect(scores.length).toBe(2);

    // Alice should rank first for SQL technical task
    expect(scores[0].agent.id).toBe("agent-alice");
    expect(scores[0].overallScore).toBeGreaterThan(scores[1].overallScore);
    expect(scores[0].breakdown.roleScore).toBe(100);
    expect(scores[0].breakdown.skillScore).toBe(100);
  });

  test("assigns task to top candidate, auto-creates isolated worktree, and records assignment", async () => {
    repos.agents.create({
      id: "agent-alice",
      name: "Alice",
      role: "BACKEND",
      skills: { sql: 5 },
      status: "available",
      lastSeen: new Date().toISOString()
    });

    const task = repos.tasks.create({
      id: "task-501",
      projectId: "proj-1",
      title: "Build Subscription Table",
      type: "FEATURE",
      status: "READY",
      acceptanceCriteria: [],
      testCriteria: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Assign automatically (scorer will pick Alice)
    const result = await assignmentService.assignTask({
      taskId: task.id,
      assignedBy: "manager"
    });

    expect(result.task.status).toBe("ASSIGNED");
    expect(result.task.assigneeId).toBe("agent-alice");
    expect(result.assignment.agentId).toBe("agent-alice");
    expect(result.assignment.status).toBe("ACTIVE");
    expect(result.assignment.revision).toBe(1);

    // Verify workspace and branch created
    expect(existsSync(result.workspace.path)).toBe(true);
    expect(result.workspace.branch).toBe("ai/task-501/alice");

    // Verify agent status updated
    const agent = repos.agents.findById("agent-alice");
    expect(agent?.status).toBe("working");

    // Verify events and audit log
    const events = repos.events.getByStreamId(task.id);
    expect(events.some((e) => e.type === "task.assigned")).toBe(true);

    const auditLogs = repos.audit.findByEntity("TASK", task.id);
    expect(auditLogs.some((a) => a.action === "task.assigned")).toBe(true);
  });

  test("supports task reassignment with traceable history and agent state updates", async () => {
    repos.agents.create({
      id: "agent-alice",
      name: "Alice",
      role: "BACKEND",
      status: "available",
      lastSeen: new Date().toISOString()
    });

    repos.agents.create({
      id: "agent-bob",
      name: "Bob",
      role: "FULLSTACK",
      status: "available",
      lastSeen: new Date().toISOString()
    });

    const task = repos.tasks.create({
      id: "task-502",
      projectId: "proj-1",
      title: "Handoff Feature",
      type: "FEATURE",
      status: "READY",
      acceptanceCriteria: [],
      testCriteria: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 1. Initial assignment to Alice
    await assignmentService.assignTask({
      taskId: task.id,
      agentId: "agent-alice"
    });

    // 2. Reassign to Bob
    const reassignResult = await assignmentService.reassignTask({
      taskId: task.id,
      newAgentId: "agent-bob",
      reason: "Alice reallocated to urgent incident"
    });

    expect(reassignResult.task.assigneeId).toBe("agent-bob");

    // Verify previous assignment status is REASSIGNED
    const allAssignments = repos.assignments.findByTaskId(task.id);
    expect(allAssignments.length).toBe(2);

    const retired = allAssignments.find((a) => a.agentId === "agent-alice");
    expect(retired?.status).toBe("REASSIGNED");
    expect(retired?.reason).toBe("Alice reallocated to urgent incident");

    const active = allAssignments.find((a) => a.agentId === "agent-bob");
    expect(active?.status).toBe("ACTIVE");

    // Verify Alice is freed and Bob is working
    expect(repos.agents.findById("agent-alice")?.status).toBe("available");
    expect(repos.agents.findById("agent-bob")?.status).toBe("working");

    // 3. Complete assignment
    assignmentService.completeAssignment(task.id);
    const completed = repos.assignments.findById(active!.id);
    expect(completed?.status).toBe("COMPLETED");
    expect(repos.agents.findById("agent-bob")?.status).toBe("available");
  });
});
