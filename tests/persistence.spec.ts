import { test, expect } from "@playwright/test";
import { createInMemoryDb } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories, ConcurrencyConflictError, NotFoundError } from "../apps/server/src/repositories";

test.describe("Phase 2A: Persistence & Domain Layer", () => {
  let db: ReturnType<typeof createInMemoryDb>;
  let repos: ReturnType<typeof createRepositories>;

  test.beforeEach(() => {
    db = createInMemoryDb();
    runMigrations(db);
    repos = createRepositories(db);
  });

  test.afterEach(() => {
    db.close();
  });

  test("Database initialization & migrations create all tables", () => {
    const tables = db.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("projects");
    expect(tableNames).toContain("agents");
    expect(tableNames).toContain("workspaces");
    expect(tableNames).toContain("tasks");
    expect(tableNames).toContain("task_dependencies");
    expect(tableNames).toContain("agent_assignments");
    expect(tableNames).toContain("reviews");
    expect(tableNames).toContain("review_findings");
    expect(tableNames).toContain("approvals");
    expect(tableNames).toContain("meetings");
    expect(tableNames).toContain("collaboration_requests");
    expect(tableNames).toContain("events");
    expect(tableNames).toContain("audit_logs");
    expect(tableNames).toContain("artifacts");
  });

  test("ProjectRepository supports CRUD and Optimistic Concurrency Control", () => {
    const project = repos.projects.create({
      id: "proj-1",
      name: "Core Platform",
      description: "Main backend platform",
      localPath: "/repos/core-platform",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: { language: "typescript" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(project.revision).toBe(1);

    const fetched = repos.projects.findById("proj-1");
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe("Core Platform");
    expect(fetched?.settings).toEqual({ language: "typescript" });

    // Valid update with expectedRevision
    const updated = repos.projects.update("proj-1", { description: "Updated description" }, 1);
    expect(updated.revision).toBe(2);
    expect(updated.description).toBe("Updated description");

    // OCC conflict: trying to update with stale revision 1
    expect(() => {
      repos.projects.update("proj-1", { name: "Conflict Name" }, 1);
    }).toThrow(ConcurrencyConflictError);

    // Update with current revision 2 succeeds
    const updated2 = repos.projects.update("proj-1", { name: "New Name" }, 2);
    expect(updated2.revision).toBe(3);
    expect(updated2.name).toBe("New Name");
  });

  test("AgentRepository supports role, skills, desk coordinates, and OCC", () => {
    const agent = repos.agents.create({
      id: "agent-alice",
      name: "Alice",
      role: "BACKEND",
      department: "Engineering",
      skills: { typescript: 5, sql: 4, docker: 3 },
      status: "available",
      summary: "Ready for tasks",
      desk: { x: 150, y: 250 },
      provider: "opencode",
      workingDirectory: "/work/alice",
      lastSeen: new Date().toISOString()
    });

    expect(agent.revision).toBe(1);
    expect(agent.skills).toEqual({ typescript: 5, sql: 4, docker: 3 });

    const updated = repos.agents.update("agent-alice", { status: "working", summary: "Refactoring DB" }, 1);
    expect(updated.revision).toBe(2);
    expect(updated.status).toBe("working");

    // OCC conflict
    expect(() => {
      repos.agents.update("agent-alice", { status: "idle" }, 1);
    }).toThrow(ConcurrencyConflictError);
  });

  test("WorkspaceRepository tracks workspace status and branch isolation", () => {
    repos.projects.create({
      id: "proj-1",
      name: "App",
      localPath: "/repos/app",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

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

    const workspace = repos.workspaces.create({
      id: "ws-1",
      projectId: "proj-1",
      agentId: "agent-alice",
      path: "/repos/app/.aioffice/worktrees/ai-task-101-alice",
      branch: "ai/task-101/alice",
      status: "READY",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(workspace.revision).toBe(1);
    expect(workspace.status).toBe("READY");

    const updated = repos.workspaces.update("ws-1", { status: "IN_USE" }, 1);
    expect(updated.status).toBe("IN_USE");
    expect(updated.revision).toBe(2);

    const byPath = repos.workspaces.findByPath("/repos/app/.aioffice/worktrees/ai-task-101-alice");
    expect(byPath?.id).toBe("ws-1");
  });

  test("TaskRepository enforces state transitions, dependencies, and non-sequential blocked condition", () => {
    repos.projects.create({
      id: "proj-1",
      name: "App",
      localPath: "/repos/app",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const task1 = repos.tasks.create({
      id: "task-1",
      projectId: "proj-1",
      title: "Design DB Schema",
      type: "TECHNICAL_TASK",
      priority: "HIGH",
      status: "READY",
      blocked: false,
      acceptanceCriteria: ["Valid DDL", "Indexes defined"],
      testCriteria: ["Schema migration passes"],
      risk: "MEDIUM",
      complexity: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const task2 = repos.tasks.create({
      id: "task-2",
      projectId: "proj-1",
      title: "Implement API Endpoints",
      type: "FEATURE",
      priority: "HIGH",
      status: "READY",
      blocked: false,
      acceptanceCriteria: ["REST endpoints return 200"],
      testCriteria: ["Integration tests pass"],
      risk: "LOW",
      complexity: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Add dependency: task-2 depends on task-1
    repos.tasks.addDependency("task-2", "task-1", "BLOCKS");
    const deps = repos.tasks.getDependencies("task-2");
    expect(deps).toHaveLength(1);
    expect(deps[0].dependsOnTaskId).toBe("task-1");

    const dependents = repos.tasks.getDependents("task-1");
    expect(dependents).toHaveLength(1);
    expect(dependents[0].taskId).toBe("task-2");

    // Blocked condition while in IN_PROGRESS (non-sequential)
    const activeTask = repos.tasks.update(
      "task-1",
      {
        status: "IN_PROGRESS",
        blocked: true,
        blockedReason: "Waiting for DB credentials",
        blockedBy: "DevOps"
      },
      1
    );

    expect(activeTask.status).toBe("IN_PROGRESS");
    expect(activeTask.blocked).toBe(true);
    expect(activeTask.blockedReason).toBe("Waiting for DB credentials");
    expect(activeTask.revision).toBe(2);

    // Unblock
    const unblockedTask = repos.tasks.update(
      "task-1",
      {
        blocked: false,
        blockedReason: undefined
      },
      2
    );
    expect(unblockedTask.blocked).toBe(false);
    expect(unblockedTask.status).toBe("IN_PROGRESS");
    expect(unblockedTask.revision).toBe(3);
  });

  test("AssignmentRepository tracks assignment history and OCC", () => {
    repos.projects.create({
      id: "proj-1",
      name: "App",
      localPath: "/repos/app",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

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

    repos.tasks.create({
      id: "task-1",
      projectId: "proj-1",
      title: "Build Feature",
      type: "FEATURE",
      priority: "MEDIUM",
      status: "READY",
      blocked: false,
      acceptanceCriteria: [],
      testCriteria: [],
      risk: "LOW",
      complexity: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const assignment = repos.assignments.create({
      id: "asgn-1",
      taskId: "task-1",
      agentId: "agent-alice",
      assignedBy: "manager",
      status: "ACTIVE",
      reason: "Best skill match",
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(assignment.revision).toBe(1);
    expect(assignment.status).toBe("ACTIVE");

    const active = repos.assignments.findActiveByTaskId("task-1");
    expect(active?.id).toBe("asgn-1");

    // Reassign with OCC
    const completed = repos.assignments.update(
      "asgn-1",
      {
        status: "COMPLETED",
        completedAt: new Date().toISOString()
      },
      1
    );
    expect(completed.status).toBe("COMPLETED");
    expect(completed.revision).toBe(2);

    expect(() => {
      repos.assignments.update("asgn-1", { status: "REASSIGNED" }, 1);
    }).toThrow(ConcurrencyConflictError);
  });

  test("ApprovalRepository binds to target revision/commit/diff and enforces idempotency", () => {
    const approval1 = repos.approvals.create({
      id: "appr-1",
      type: "MERGE",
      targetId: "task-101",
      targetRevision: 4,
      targetCommit: "commit-abc-123",
      targetDiffHash: "diff-hash-xyz-789",
      status: "PENDING",
      requesterId: "agent-alice",
      reason: "Feature complete and all tests pass",
      risk: "LOW",
      evidence: { testCoverage: 98, changedFiles: 3 },
      idempotencyKey: "merge-task-101-commit-abc-123",
      createdAt: new Date().toISOString()
    });

    expect(approval1.revision).toBe(1);
    expect(approval1.targetCommit).toBe("commit-abc-123");
    expect(approval1.targetDiffHash).toBe("diff-hash-xyz-789");

    // Idempotent duplicate creation returns the existing approval without duplicate rows
    const approvalDuplicate = repos.approvals.create({
      id: "appr-duplicate",
      type: "MERGE",
      targetId: "task-101",
      targetRevision: 4,
      targetCommit: "commit-abc-123",
      targetDiffHash: "diff-hash-xyz-789",
      status: "PENDING",
      requesterId: "agent-alice",
      reason: "Feature complete and all tests pass",
      risk: "LOW",
      evidence: {},
      idempotencyKey: "merge-task-101-commit-abc-123",
      createdAt: new Date().toISOString()
    });

    expect(approvalDuplicate.id).toBe("appr-1");

    // Approve with OCC
    const approved = repos.approvals.update(
      "appr-1",
      {
        status: "APPROVED",
        approverId: "human-admin",
        decisionNotes: "Code looks great, authorized to merge",
        decidedAt: new Date().toISOString()
      },
      1
    );
    expect(approved.status).toBe("APPROVED");
    expect(approved.revision).toBe(2);
  });

  test("ReviewRepository and ReviewFindings track evidence and fix commits", () => {
    repos.projects.create({
      id: "proj-1",
      name: "App",
      localPath: "/repos/app",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    repos.agents.create({
      id: "agent-reviewer",
      name: "Senior Reviewer",
      role: "SECURITY",
      department: "Engineering",
      skills: {},
      status: "available",
      summary: "Ready",
      desk: { x: 0, y: 0 },
      provider: "opencode",
      lastSeen: new Date().toISOString()
    });

    repos.tasks.create({
      id: "task-1",
      projectId: "proj-1",
      title: "Auth Module",
      type: "FEATURE",
      priority: "HIGH",
      status: "READY_FOR_REVIEW",
      blocked: false,
      acceptanceCriteria: [],
      testCriteria: [],
      risk: "HIGH",
      complexity: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const review = repos.reviews.createReview({
      id: "rev-1",
      taskId: "task-1",
      reviewerId: "agent-reviewer",
      status: "IN_PROGRESS",
      summary: "Reviewing auth changes",
      commitHash: "commit-auth-1",
      diffHash: "diff-auth-1",
      findings: [],
      createdAt: new Date().toISOString()
    });

    const finding = repos.reviews.addFinding({
      id: "find-1",
      reviewId: "rev-1",
      severity: "HIGH",
      category: "SECURITY",
      file: "src/auth/jwt.ts",
      line: 42,
      message: "Hardcoded fallback JWT secret",
      recommendation: "Use process.env.JWT_SECRET and fail if missing",
      evidence: "const secret = process.env.JWT_SECRET || 'dev-secret';",
      status: "PENDING",
      introducedCommit: "commit-auth-1"
    });

    expect(finding.id).toBe("find-1");

    // Resolve finding with fix commit
    const resolvedFinding = repos.reviews.updateFinding("find-1", {
      status: "RESOLVED",
      resolvedCommit: "commit-auth-2-fix",
      resolvedBy: "agent-alice",
      resolvedAt: new Date().toISOString(),
      resolution: "Replaced with strict environment variable validation"
    });

    expect(resolvedFinding.status).toBe("RESOLVED");
    expect(resolvedFinding.resolvedCommit).toBe("commit-auth-2-fix");

    const fullReview = repos.reviews.findReviewById("rev-1");
    expect(fullReview?.findings).toHaveLength(1);
    expect(fullReview?.findings[0].status).toBe("RESOLVED");
  });

  test("EventRepository allocates monotonic sequence numbers per stream", () => {
    const e1 = repos.events.append({
      eventId: "ev-1",
      streamId: "task-100",
      type: "task.created",
      producer: "task-service",
      schemaVersion: "1.0",
      payload: { title: "Test Task" },
      timestamp: new Date().toISOString()
    });

    const e2 = repos.events.append({
      eventId: "ev-2",
      streamId: "task-100",
      type: "task.assigned",
      producer: "assignment-service",
      schemaVersion: "1.0",
      payload: { agentId: "agent-bob" },
      timestamp: new Date().toISOString()
    });

    const e3 = repos.events.append({
      eventId: "ev-3",
      streamId: "task-200", // separate stream
      type: "task.created",
      producer: "task-service",
      schemaVersion: "1.0",
      payload: { title: "Another Task" },
      timestamp: new Date().toISOString()
    });

    expect(e1.sequenceNumber).toBe(1);
    expect(e2.sequenceNumber).toBe(2);
    expect(e3.sequenceNumber).toBe(1); // new stream starts at 1

    const task100Events = repos.events.getByStreamId("task-100");
    expect(task100Events).toHaveLength(2);
    expect(task100Events[0].sequenceNumber).toBe(1);
    expect(task100Events[1].sequenceNumber).toBe(2);
  });

  test("AuditRepository records immutable security and management actions", () => {
    repos.audit.append({
      id: "audit-1",
      action: "approval.granted",
      actorId: "human-admin",
      entityType: "APPROVAL",
      entityId: "appr-1",
      details: { targetCommit: "abc123" },
      timestamp: new Date().toISOString()
    });

    const logs = repos.audit.findByEntity("APPROVAL", "appr-1");
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("approval.granted");
    expect(logs[0].actorId).toBe("human-admin");
  });

  test("ArtifactRepository stores multi-storage engineering artifacts", () => {
    repos.projects.create({
      id: "proj-1",
      name: "App",
      localPath: "/repos/app",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    repos.tasks.create({
      id: "task-1",
      projectId: "proj-1",
      title: "Task 1",
      status: "READY",
      acceptanceCriteria: [],
      testCriteria: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const artifact = repos.artifacts.create({
      id: "art-1",
      type: "DIFF",
      projectId: "proj-1",
      taskId: "task-1",
      storageType: "DIFF",
      uri: "diff://task-1/v1",
      contentHash: "sha256-abcde...",
      metadata: { addedLines: 45, removedLines: 12 },
      version: 1,
      createdAt: new Date().toISOString()
    });

    expect(artifact.id).toBe("art-1");
    expect(artifact.storageType).toBe("DIFF");

    const fetched = repos.artifacts.findById("art-1");
    expect(fetched?.metadata).toEqual({ addedLines: 45, removedLines: 12 });
  });
});
