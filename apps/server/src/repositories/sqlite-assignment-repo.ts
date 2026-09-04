import type { AgentAssignment } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { AssignmentRepository, ConcurrencyConflictError, NotFoundError } from "./types";

export class SqliteAssignmentRepository implements AssignmentRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): AgentAssignment {
    return {
      id: row.id,
      taskId: row.task_id,
      agentId: row.agent_id,
      workspaceId: row.workspace_id || undefined,
      assignedBy: row.assigned_by,
      status: row.status as any,
      reason: row.reason || undefined,
      revision: row.revision,
      assignedAt: row.assigned_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined
    };
  }

  create(data: Omit<AgentAssignment, "revision">): AgentAssignment {
    const revision = 1;
    const stmt = this.db.prepare(`
      INSERT INTO agent_assignments (id, task_id, agent_id, workspace_id, assigned_by, status, reason, revision, assigned_at, updated_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.taskId,
      data.agentId,
      data.workspaceId || null,
      data.assignedBy || "manager",
      data.status || "ACTIVE",
      data.reason || null,
      revision,
      data.assignedAt,
      data.updatedAt || data.assignedAt,
      data.completedAt || null
    );
    return { ...data, revision };
  }

  findById(id: string): AgentAssignment | null {
    const row = this.db.prepare("SELECT * FROM agent_assignments WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByTaskId(taskId: string): AgentAssignment[] {
    const rows = this.db.prepare("SELECT * FROM agent_assignments WHERE task_id = ? ORDER BY assigned_at DESC").all(taskId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findByAgentId(agentId: string): AgentAssignment[] {
    const rows = this.db.prepare("SELECT * FROM agent_assignments WHERE agent_id = ? ORDER BY assigned_at DESC").all(agentId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findActiveByTaskId(taskId: string): AgentAssignment | null {
    const row = this.db.prepare("SELECT * FROM agent_assignments WHERE task_id = ? AND status = 'ACTIVE' LIMIT 1").get(taskId);
    return row ? this.mapRow(row) : null;
  }

  update(id: string, updates: Partial<AgentAssignment>, expectedRevision?: number): AgentAssignment {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("AgentAssignment", id);
    }

    if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new ConcurrencyConflictError("AgentAssignment", id, expectedRevision, existing.revision);
    }

    const nextRevision = existing.revision + 1;
    const workspaceId = updates.workspaceId !== undefined ? updates.workspaceId : existing.workspaceId;
    const status = updates.status ?? existing.status;
    const reason = updates.reason !== undefined ? updates.reason : existing.reason;
    const completedAt = updates.completedAt !== undefined ? updates.completedAt : existing.completedAt;
    const updatedAt = updates.updatedAt || new Date().toISOString();

    const sql = `
      UPDATE agent_assignments
      SET workspace_id = ?, status = ?, reason = ?, revision = ?, updated_at = ?, completed_at = ?
      WHERE id = ? AND revision = ?
    `;
    const res = this.db.prepare(sql).run(
      workspaceId || null,
      status,
      reason || null,
      nextRevision,
      updatedAt,
      completedAt || null,
      id,
      existing.revision
    );

    if (res.changes === 0) {
      const current = this.findById(id);
      throw new ConcurrencyConflictError("AgentAssignment", id, existing.revision, current?.revision ?? 0);
    }

    return this.findById(id)!;
  }
}
