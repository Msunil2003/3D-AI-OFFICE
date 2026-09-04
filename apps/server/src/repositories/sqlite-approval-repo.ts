import type { Approval } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { ApprovalRepository, ConcurrencyConflictError, NotFoundError } from "./types";

export class SqliteApprovalRepository implements ApprovalRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): Approval {
    return {
      id: row.id,
      type: row.type as any,
      targetId: row.target_id,
      targetRevision: row.target_revision,
      targetCommit: row.target_commit,
      targetDiffHash: row.target_diff_hash,
      status: row.status as any,
      requesterId: row.requester_id,
      approverId: row.approver_id || undefined,
      reason: row.reason,
      risk: row.risk as any,
      evidence: JSON.parse(row.evidence || "{}"),
      idempotencyKey: row.idempotency_key || undefined,
      decisionNotes: row.decision_notes || undefined,
      revision: row.revision,
      createdAt: row.created_at,
      decidedAt: row.decided_at || undefined
    };
  }

  create(data: Omit<Approval, "revision">): Approval {
    // If idempotencyKey provided, check if already exists
    if (data.idempotencyKey) {
      const existing = this.findByIdempotencyKey(data.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const revision = 1;
    const stmt = this.db.prepare(`
      INSERT INTO approvals (
        id, type, target_id, target_revision, target_commit, target_diff_hash, status,
        requester_id, approver_id, reason, risk, evidence, idempotency_key, decision_notes,
        revision, created_at, decided_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.type,
      data.targetId,
      data.targetRevision,
      data.targetCommit,
      data.targetDiffHash,
      data.status || "PENDING",
      data.requesterId,
      data.approverId || null,
      data.reason,
      data.risk || "MEDIUM",
      JSON.stringify(data.evidence || {}),
      data.idempotencyKey || null,
      data.decisionNotes || null,
      revision,
      data.createdAt,
      data.decidedAt || null
    );
    return { ...data, revision };
  }

  findById(id: string): Approval | null {
    const row = this.db.prepare("SELECT * FROM approvals WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByIdempotencyKey(key: string): Approval | null {
    const row = this.db.prepare("SELECT * FROM approvals WHERE idempotency_key = ?").get(key);
    return row ? this.mapRow(row) : null;
  }

  findByTargetId(targetId: string): Approval[] {
    const rows = this.db.prepare("SELECT * FROM approvals WHERE target_id = ? ORDER BY created_at DESC").all(targetId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findPending(): Approval[] {
    const rows = this.db.prepare("SELECT * FROM approvals WHERE status = 'PENDING' ORDER BY created_at DESC").all();
    return rows.map((r: any) => this.mapRow(r));
  }

  findAll(): Approval[] {
    const rows = this.db.prepare("SELECT * FROM approvals ORDER BY created_at DESC").all();
    return rows.map((r: any) => this.mapRow(r));
  }

  update(id: string, updates: Partial<Approval>, expectedRevision?: number): Approval {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("Approval", id);
    }

    if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new ConcurrencyConflictError("Approval", id, expectedRevision, existing.revision);
    }

    const nextRevision = existing.revision + 1;
    const status = updates.status ?? existing.status;
    const approverId = updates.approverId !== undefined ? updates.approverId : existing.approverId;
    const decisionNotes = updates.decisionNotes !== undefined ? updates.decisionNotes : existing.decisionNotes;
    const decidedAt = updates.decidedAt !== undefined ? updates.decidedAt : existing.decidedAt;

    const sql = `
      UPDATE approvals
      SET status = ?, approver_id = ?, decision_notes = ?, revision = ?, decided_at = ?
      WHERE id = ? AND revision = ?
    `;
    const res = this.db.prepare(sql).run(
      status,
      approverId || null,
      decisionNotes || null,
      nextRevision,
      decidedAt || null,
      id,
      existing.revision
    );

    if (res.changes === 0) {
      const current = this.findById(id);
      throw new ConcurrencyConflictError("Approval", id, existing.revision, current?.revision ?? 0);
    }

    return this.findById(id)!;
  }
}
