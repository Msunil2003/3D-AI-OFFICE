import type { AgentEntity } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { AgentRepository, ConcurrencyConflictError, NotFoundError } from "./types";

export class SqliteAgentRepository implements AgentRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): AgentEntity {
    return {
      id: row.id,
      name: row.name,
      role: row.role as any,
      department: row.department,
      skills: JSON.parse(row.skills || "{}"),
      status: row.status as any,
      summary: row.summary,
      desk: { x: row.desk_x, y: row.desk_y },
      provider: row.provider,
      workingDirectory: row.working_directory || undefined,
      revision: row.revision,
      lastSeen: row.last_seen
    };
  }

  create(data: Omit<AgentEntity, "revision">): AgentEntity {
    const revision = 1;
    const stmt = this.db.prepare(`
      INSERT INTO agents (id, name, role, department, skills, status, summary, desk_x, desk_y, provider, working_directory, revision, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.name,
      data.role || "FULLSTACK",
      data.department || "Engineering",
      JSON.stringify(data.skills || {}),
      data.status || "available",
      data.summary || "Ready",
      data.desk?.x ?? 0,
      data.desk?.y ?? 0,
      data.provider || "opencode",
      data.workingDirectory || null,
      revision,
      data.lastSeen || new Date().toISOString()
    );
    return { ...data, revision };
  }

  findById(id: string): AgentEntity | null {
    const row = this.db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findAll(): AgentEntity[] {
    const rows = this.db.prepare("SELECT * FROM agents ORDER BY name ASC").all();
    return rows.map((r: any) => this.mapRow(r));
  }

  update(id: string, updates: Partial<AgentEntity>, expectedRevision?: number): AgentEntity {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("Agent", id);
    }

    if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new ConcurrencyConflictError("Agent", id, expectedRevision, existing.revision);
    }

    const nextRevision = existing.revision + 1;
    const name = updates.name ?? existing.name;
    const role = updates.role ?? existing.role;
    const department = updates.department ?? existing.department;
    const skills = updates.skills ? JSON.stringify(updates.skills) : JSON.stringify(existing.skills);
    const status = updates.status ?? existing.status;
    const summary = updates.summary ?? existing.summary;
    const deskX = updates.desk?.x ?? existing.desk.x;
    const deskY = updates.desk?.y ?? existing.desk.y;
    const provider = updates.provider ?? existing.provider;
    const workingDirectory = updates.workingDirectory !== undefined ? updates.workingDirectory : existing.workingDirectory;
    const lastSeen = updates.lastSeen || new Date().toISOString();

    const sql = `
      UPDATE agents
      SET name = ?, role = ?, department = ?, skills = ?, status = ?, summary = ?, desk_x = ?, desk_y = ?, provider = ?, working_directory = ?, revision = ?, last_seen = ?
      WHERE id = ? AND revision = ?
    `;
    const res = this.db.prepare(sql).run(
      name,
      role,
      department,
      skills,
      status,
      summary,
      deskX,
      deskY,
      provider,
      workingDirectory || null,
      nextRevision,
      lastSeen,
      id,
      existing.revision
    );

    if (res.changes === 0) {
      const current = this.findById(id);
      throw new ConcurrencyConflictError("Agent", id, existing.revision, current?.revision ?? 0);
    }

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const res = this.db.prepare("DELETE FROM agents WHERE id = ?").run(id);
    return res.changes > 0;
  }
}
