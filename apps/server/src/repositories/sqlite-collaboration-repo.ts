import type { CollaborationRequest } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { CollaborationRepository, NotFoundError } from "./types";

export class SqliteCollaborationRepository implements CollaborationRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): CollaborationRequest {
    return {
      id: row.id,
      taskId: row.task_id,
      projectId: row.project_id,
      senderId: row.sender_id,
      recipientId: row.recipient_id,
      reason: row.reason,
      message: row.message,
      status: row.status as any,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: CollaborationRequest): CollaborationRequest {
    const stmt = this.db.prepare(`
      INSERT INTO collaboration_requests (id, task_id, project_id, sender_id, recipient_id, reason, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.taskId,
      data.projectId,
      data.senderId,
      data.recipientId,
      data.reason,
      data.message,
      data.status || "REQUESTED",
      data.createdAt,
      data.updatedAt || data.createdAt
    );
    return data;
  }

  findById(id: string): CollaborationRequest | null {
    const row = this.db.prepare("SELECT * FROM collaboration_requests WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByTaskId(taskId: string): CollaborationRequest[] {
    const rows = this.db.prepare("SELECT * FROM collaboration_requests WHERE task_id = ? ORDER BY created_at DESC").all(taskId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findByRecipientId(recipientId: string): CollaborationRequest[] {
    const rows = this.db.prepare("SELECT * FROM collaboration_requests WHERE recipient_id = ? ORDER BY created_at DESC").all(recipientId);
    return rows.map((r: any) => this.mapRow(r));
  }

  update(id: string, updates: Partial<CollaborationRequest>): CollaborationRequest {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("CollaborationRequest", id);
    }

    const status = updates.status ?? existing.status;
    const updatedAt = updates.updatedAt || new Date().toISOString();

    this.db.prepare(`
      UPDATE collaboration_requests SET status = ?, updated_at = ? WHERE id = ?
    `).run(status, updatedAt, id);

    return this.findById(id)!;
  }
}
