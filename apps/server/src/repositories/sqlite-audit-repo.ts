import type { AuditLog } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { AuditRepository } from "./types";

export class SqliteAuditRepository implements AuditRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): AuditLog {
    return {
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      entityType: row.entity_type as any,
      entityId: row.entity_id,
      details: JSON.parse(row.details || "{}"),
      idempotencyKey: row.idempotency_key || undefined,
      timestamp: row.timestamp
    };
  }

  append(entry: AuditLog): void {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, action, actor_id, entity_type, entity_id, details, idempotency_key, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      entry.id,
      entry.action,
      entry.actorId,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.details || {}),
      entry.idempotencyKey || null,
      entry.timestamp
    );
  }

  findByEntity(entityType: string, entityId: string): AuditLog[] {
    const rows = this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY timestamp DESC
    `).all(entityType, entityId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findLatest(limit: number = 100): AuditLog[] {
    const rows = this.db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);
    return rows.map((r: any) => this.mapRow(r));
  }
}
