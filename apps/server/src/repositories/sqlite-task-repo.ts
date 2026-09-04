import type { Task, TaskDependency } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { ConcurrencyConflictError, NotFoundError, TaskRepository } from "./types";

export class SqliteTaskRepository implements TaskRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      parentTaskId: row.parent_task_id || undefined,
      title: row.title,
      description: row.description || undefined,
      type: row.type as any,
      priority: row.priority as any,
      status: row.status as any,
      blocked: Boolean(row.blocked),
      blockedReason: row.blocked_reason || undefined,
      blockedBy: row.blocked_by || undefined,
      blockedAt: row.blocked_at || undefined,
      assigneeId: row.assignee_id || undefined,
      workspaceId: row.workspace_id || undefined,
      branch: row.branch || undefined,
      acceptanceCriteria: JSON.parse(row.acceptance_criteria || "[]"),
      testCriteria: JSON.parse(row.test_criteria || "[]"),
      risk: row.risk as any,
      complexity: row.complexity,
      revision: row.revision,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at
    };
  }

  create(data: Omit<Task, "revision">): Task {
    const revision = 1;
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, project_id, parent_task_id, title, description, type, priority, status,
        blocked, blocked_reason, blocked_by, blocked_at, assignee_id, workspace_id, branch,
        acceptance_criteria, test_criteria, risk, complexity, revision, created_at, started_at, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.projectId,
      data.parentTaskId || null,
      data.title,
      data.description || null,
      data.type || "FEATURE",
      data.priority || "MEDIUM",
      data.status || "READY",
      data.blocked ? 1 : 0,
      data.blockedReason || null,
      data.blockedBy || null,
      data.blockedAt || null,
      data.assigneeId || null,
      data.workspaceId || null,
      data.branch || null,
      JSON.stringify(data.acceptanceCriteria || []),
      JSON.stringify(data.testCriteria || []),
      data.risk || "LOW",
      data.complexity ?? 3,
      revision,
      data.createdAt,
      data.startedAt || null,
      data.completedAt || null,
      data.updatedAt
    );
    return { ...data, revision };
  }

  findById(id: string): Task | null {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByProjectId(projectId: string): Task[] {
    const rows = this.db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC").all(projectId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findByAssigneeId(assigneeId: string): Task[] {
    const rows = this.db.prepare("SELECT * FROM tasks WHERE assignee_id = ? ORDER BY created_at DESC").all(assigneeId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findAll(): Task[] {
    const rows = this.db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
    return rows.map((r: any) => this.mapRow(r));
  }

  update(id: string, updates: Partial<Task>, expectedRevision?: number): Task {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("Task", id);
    }

    if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new ConcurrencyConflictError("Task", id, expectedRevision, existing.revision);
    }

    const nextRevision = existing.revision + 1;
    const parentTaskId = updates.parentTaskId !== undefined ? updates.parentTaskId : existing.parentTaskId;
    const title = updates.title ?? existing.title;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const type = updates.type ?? existing.type;
    const priority = updates.priority ?? existing.priority;
    const status = updates.status ?? existing.status;
    const blocked = updates.blocked !== undefined ? (updates.blocked ? 1 : 0) : (existing.blocked ? 1 : 0);
    const blockedReason = "blockedReason" in updates ? (updates.blockedReason ?? null) : existing.blockedReason;
    const blockedBy = "blockedBy" in updates ? (updates.blockedBy ?? null) : existing.blockedBy;
    const blockedAt = "blockedAt" in updates ? (updates.blockedAt ?? null) : existing.blockedAt;
    const assigneeId = updates.assigneeId !== undefined ? updates.assigneeId : existing.assigneeId;
    const workspaceId = updates.workspaceId !== undefined ? updates.workspaceId : existing.workspaceId;
    const branch = updates.branch !== undefined ? updates.branch : existing.branch;
    const acceptanceCriteria = updates.acceptanceCriteria ? JSON.stringify(updates.acceptanceCriteria) : JSON.stringify(existing.acceptanceCriteria);
    const testCriteria = updates.testCriteria ? JSON.stringify(updates.testCriteria) : JSON.stringify(existing.testCriteria);
    const risk = updates.risk ?? existing.risk;
    const complexity = updates.complexity ?? existing.complexity;
    const startedAt = updates.startedAt !== undefined ? updates.startedAt : existing.startedAt;
    const completedAt = updates.completedAt !== undefined ? updates.completedAt : existing.completedAt;
    const updatedAt = updates.updatedAt || new Date().toISOString();

    const sql = `
      UPDATE tasks
      SET parent_task_id = ?, title = ?, description = ?, type = ?, priority = ?, status = ?,
          blocked = ?, blocked_reason = ?, blocked_by = ?, blocked_at = ?, assignee_id = ?, workspace_id = ?,
          branch = ?, acceptance_criteria = ?, test_criteria = ?, risk = ?, complexity = ?,
          revision = ?, started_at = ?, completed_at = ?, updated_at = ?
      WHERE id = ? AND revision = ?
    `;
    const res = this.db.prepare(sql).run(
      parentTaskId || null,
      title,
      description || null,
      type,
      priority,
      status,
      blocked,
      blockedReason || null,
      blockedBy || null,
      blockedAt || null,
      assigneeId || null,
      workspaceId || null,
      branch || null,
      acceptanceCriteria,
      testCriteria,
      risk,
      complexity,
      nextRevision,
      startedAt || null,
      completedAt || null,
      updatedAt,
      id,
      existing.revision
    );

    if (res.changes === 0) {
      const current = this.findById(id);
      throw new ConcurrencyConflictError("Task", id, existing.revision, current?.revision ?? 0);
    }

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const res = this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    return res.changes > 0;
  }

  addDependency(taskId: string, dependsOnTaskId: string, type: "BLOCKS" | "RELATES_TO" = "BLOCKS"): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO task_dependencies (task_id, depends_on_task_id, type)
      VALUES (?, ?, ?)
    `);
    stmt.run(taskId, dependsOnTaskId, type);
  }

  getDependencies(taskId: string): TaskDependency[] {
    const rows = this.db.prepare("SELECT * FROM task_dependencies WHERE task_id = ?").all(taskId);
    return rows.map((r: any) => ({
      taskId: r.task_id,
      dependsOnTaskId: r.depends_on_task_id,
      type: r.type
    }));
  }

  getDependents(taskId: string): TaskDependency[] {
    const rows = this.db.prepare("SELECT * FROM task_dependencies WHERE depends_on_task_id = ?").all(taskId);
    return rows.map((r: any) => ({
      taskId: r.task_id,
      dependsOnTaskId: r.depends_on_task_id,
      type: r.type
    }));
  }
}
