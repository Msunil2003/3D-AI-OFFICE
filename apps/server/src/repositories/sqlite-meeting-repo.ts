import type { Meeting } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { ConcurrencyConflictError, MeetingRepository, NotFoundError } from "./types";

export class SqliteMeetingRepository implements MeetingRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): Meeting {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      purpose: row.purpose,
      status: row.status as any,
      participants: JSON.parse(row.participants || "[]"),
      agenda: JSON.parse(row.agenda || "[]"),
      outcomes: JSON.parse(row.outcomes || "[]"),
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined
    };
  }

  create(data: Omit<Meeting, "revision">): Meeting {
    const revision = 1;
    const stmt = this.db.prepare(`
      INSERT INTO meetings (id, project_id, title, purpose, status, participants, agenda, outcomes, revision, created_at, updated_at, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.projectId,
      data.title,
      data.purpose,
      data.status || "SCHEDULED",
      JSON.stringify(data.participants || []),
      JSON.stringify(data.agenda || []),
      JSON.stringify(data.outcomes || []),
      revision,
      data.createdAt,
      data.updatedAt || data.createdAt,
      data.startedAt || null,
      data.completedAt || null
    );
    return { ...data, revision };
  }

  findById(id: string): Meeting | null {
    const row = this.db.prepare("SELECT * FROM meetings WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByProjectId(projectId: string): Meeting[] {
    const rows = this.db.prepare("SELECT * FROM meetings WHERE project_id = ? ORDER BY created_at DESC").all(projectId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findAll(): Meeting[] {
    const rows = this.db.prepare("SELECT * FROM meetings ORDER BY created_at DESC").all();
    return rows.map((r: any) => this.mapRow(r));
  }

  update(id: string, updates: Partial<Meeting>, expectedRevision?: number): Meeting {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("Meeting", id);
    }

    if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new ConcurrencyConflictError("Meeting", id, expectedRevision, existing.revision);
    }

    const nextRevision = existing.revision + 1;
    const title = updates.title ?? existing.title;
    const purpose = updates.purpose ?? existing.purpose;
    const status = updates.status ?? existing.status;
    const participants = updates.participants ? JSON.stringify(updates.participants) : JSON.stringify(existing.participants);
    const agenda = updates.agenda ? JSON.stringify(updates.agenda) : JSON.stringify(existing.agenda);
    const outcomes = updates.outcomes ? JSON.stringify(updates.outcomes) : JSON.stringify(existing.outcomes);
    const startedAt = updates.startedAt !== undefined ? updates.startedAt : existing.startedAt;
    const completedAt = updates.completedAt !== undefined ? updates.completedAt : existing.completedAt;
    const updatedAt = updates.updatedAt || new Date().toISOString();

    const sql = `
      UPDATE meetings
      SET title = ?, purpose = ?, status = ?, participants = ?, agenda = ?, outcomes = ?,
          revision = ?, updated_at = ?, started_at = ?, completed_at = ?
      WHERE id = ? AND revision = ?
    `;
    const res = this.db.prepare(sql).run(
      title,
      purpose,
      status,
      participants,
      agenda,
      outcomes,
      nextRevision,
      updatedAt,
      startedAt || null,
      completedAt || null,
      id,
      existing.revision
    );

    if (res.changes === 0) {
      const current = this.findById(id);
      throw new ConcurrencyConflictError("Meeting", id, existing.revision, current?.revision ?? 0);
    }

    return this.findById(id)!;
  }
}
