import type { Workspace } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { ConcurrencyConflictError, NotFoundError, WorkspaceRepository } from "./types";

export class SqliteWorkspaceRepository implements WorkspaceRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): Workspace {
    return {
      id: row.id,
      projectId: row.project_id,
      agentId: row.agent_id || undefined,
      path: row.path,
      branch: row.branch,
      worktreeId: row.worktree_id || undefined,
      status: row.status as any,
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: Omit<Workspace, "revision">): Workspace {
    const revision = 1;
    const stmt = this.db.prepare(`
      INSERT INTO workspaces (id, project_id, agent_id, path, branch, worktree_id, status, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.projectId,
      data.agentId || null,
      data.path,
      data.branch,
      data.worktreeId || null,
      data.status || "READY",
      revision,
      data.createdAt,
      data.updatedAt
    );
    return { ...data, revision };
  }

  findById(id: string): Workspace | null {
    const row = this.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByPath(path: string): Workspace | null {
    const row = this.db.prepare("SELECT * FROM workspaces WHERE path = ?").get(path);
    return row ? this.mapRow(row) : null;
  }

  findByProjectId(projectId: string): Workspace[] {
    const rows = this.db.prepare("SELECT * FROM workspaces WHERE project_id = ? ORDER BY created_at DESC").all(projectId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findAll(): Workspace[] {
    const rows = this.db.prepare("SELECT * FROM workspaces ORDER BY created_at DESC").all();
    return rows.map((r: any) => this.mapRow(r));
  }

  update(id: string, updates: Partial<Workspace>, expectedRevision?: number): Workspace {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("Workspace", id);
    }

    if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new ConcurrencyConflictError("Workspace", id, expectedRevision, existing.revision);
    }

    const nextRevision = existing.revision + 1;
    const agentId = updates.agentId !== undefined ? updates.agentId : existing.agentId;
    const path = updates.path ?? existing.path;
    const branch = updates.branch ?? existing.branch;
    const worktreeId = updates.worktreeId !== undefined ? updates.worktreeId : existing.worktreeId;
    const status = updates.status ?? existing.status;
    const updatedAt = updates.updatedAt || new Date().toISOString();

    const sql = `
      UPDATE workspaces
      SET agent_id = ?, path = ?, branch = ?, worktree_id = ?, status = ?, revision = ?, updated_at = ?
      WHERE id = ? AND revision = ?
    `;
    const res = this.db.prepare(sql).run(
      agentId || null,
      path,
      branch,
      worktreeId || null,
      status,
      nextRevision,
      updatedAt,
      id,
      existing.revision
    );

    if (res.changes === 0) {
      const current = this.findById(id);
      throw new ConcurrencyConflictError("Workspace", id, existing.revision, current?.revision ?? 0);
    }

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const res = this.db.prepare("DELETE FROM workspaces WHERE id = ?").run(id);
    return res.changes > 0;
  }
}
