import { test, expect } from "@playwright/test";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { SqliteDatabase } from "../apps/server/src/db/database";
import { runMigrations } from "../apps/server/src/db/migrations";
import { createRepositories } from "../apps/server/src/repositories";

test.describe("Phase 20: Data Backup & Recovery Validation", () => {
  const scratchDir = path.resolve(process.cwd(), "data", "test-scratch", "backup-test");
  const primaryDbPath = path.join(scratchDir, "primary.db");
  const backupDbPath = path.join(scratchDir, "backup.db");
  const restoredDbPath = path.join(scratchDir, "restored.db");

  test.beforeEach(() => {
    if (existsSync(scratchDir)) {
      rmSync(scratchDir, { recursive: true, force: true });
    }
    mkdirSync(scratchDir, { recursive: true });
  });

  test.afterEach(() => {
    if (existsSync(scratchDir)) {
      try {
        rmSync(scratchDir, { recursive: true, force: true });
      } catch {
        // Non-fatal cleanup
      }
    }
  });

  test("validates full SQLite persistence, backup generation, and successful data restoration", async () => {
    // 1. Initialize Primary Database
    const primaryDb = new SqliteDatabase(primaryDbPath);
    runMigrations(primaryDb);
    const repos = createRepositories(primaryDb);

    const now = new Date().toISOString();

    // 2. Populate authoritative state across multiple domains
    repos.projects.create({
      id: "proj-backup-test",
      name: "Mission Critical Core",
      localPath: "/tmp/repo",
      defaultBranch: "main",
      status: "ACTIVE",
      settings: {},
      createdAt: now,
      updatedAt: now
    });

    const taskId = "task-sec-001";
    const task = repos.tasks.create({
      id: taskId,
      projectId: "proj-backup-test",
      title: "Core security patch",
      description: "Harden cryptographic key exchange",
      status: "IN_PROGRESS",
      type: "FEATURE",
      priority: "HIGH",
      createdAt: now,
      updatedAt: now
    });

    const approvalId = "appr-sec-001";
    repos.approvals.create({
      id: approvalId,
      type: "MERGE",
      status: "PENDING",
      targetId: task.id,
      targetRevision: 1,
      targetCommit: "c0ffee123456",
      targetDiffHash: "diffhash9876",
      requesterId: "agent-security",
      reason: "Security patch ready for review",
      risk: "HIGH",
      evidence: { staticAnalysis: "PASS" },
      decisionNotes: "Awaiting final review",
      createdAt: now
    });

    repos.audit.append({
      id: "audit-entry-001",
      action: "task.created",
      actorId: "human-ceo",
      entityType: "TASK" as any,
      entityId: task.id,
      details: { title: task.title, risk: "HIGH" },
      timestamp: now
    });

    // 3. Check WAL checkpoint / close primary to simulate clean backup snapshot
    primaryDb.exec("PRAGMA wal_checkpoint(FULL);");
    copyFileSync(primaryDbPath, backupDbPath);
    expect(existsSync(backupDbPath)).toBe(true);

    // 4. Simulate disaster / restore backup into clean database instance
    copyFileSync(backupDbPath, restoredDbPath);
    const restoredDb = new SqliteDatabase(restoredDbPath);
    const restoredRepos = createRepositories(restoredDb);

    // 5. Verify restored state fidelity
    const restoredProject = restoredRepos.projects.findById("proj-backup-test");
    expect(restoredProject).toBeDefined();
    expect(restoredProject?.name).toBe("Mission Critical Core");

    const restoredTask = restoredRepos.tasks.findById(task.id);
    expect(restoredTask).toBeDefined();
    expect(restoredTask?.title).toBe("Core security patch");
    expect(restoredTask?.status).toBe("IN_PROGRESS");

    const restoredApprovals = restoredRepos.approvals.findByTargetId(task.id);
    expect(restoredApprovals.length).toBe(1);
    expect(restoredApprovals[0].targetCommit).toBe("c0ffee123456");
    expect(restoredApprovals[0].status).toBe("PENDING");

    const restoredAudit = restoredRepos.audit.findByEntity("TASK", task.id);
    expect(restoredAudit.length).toBe(1);
    expect(restoredAudit[0].action).toBe("task.created");
    expect(restoredAudit[0].actorId).toBe("human-ceo");
  });
});
