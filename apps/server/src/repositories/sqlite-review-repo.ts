import type { Review, ReviewFinding } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { NotFoundError, ReviewRepository } from "./types";

export class SqliteReviewRepository implements ReviewRepository {
  constructor(private db: SqliteDatabase) {}

  private mapFindingRow(row: any): ReviewFinding {
    return {
      id: row.id,
      reviewId: row.review_id,
      severity: row.severity as any,
      category: row.category as any,
      file: row.file,
      line: row.line ?? undefined,
      message: row.message,
      recommendation: row.recommendation,
      evidence: row.evidence || undefined,
      status: row.status as any,
      introducedCommit: row.introduced_commit || undefined,
      resolvedCommit: row.resolved_commit || undefined,
      resolvedAt: row.resolved_at || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolution: row.resolution || undefined
    };
  }

  private mapReviewRow(row: any, findings: ReviewFinding[] = []): Review {
    return {
      id: row.id,
      taskId: row.task_id,
      reviewerId: row.reviewer_id,
      status: row.status as any,
      summary: row.summary || undefined,
      commitHash: row.commit_hash,
      diffHash: row.diff_hash,
      findings,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined
    };
  }

  createReview(data: Review): Review {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (id, task_id, reviewer_id, status, summary, commit_hash, diff_hash, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.taskId,
      data.reviewerId,
      data.status || "IN_PROGRESS",
      data.summary || null,
      data.commitHash,
      data.diffHash,
      data.createdAt,
      data.completedAt || null
    );

    if (data.findings && data.findings.length > 0) {
      for (const f of data.findings) {
        this.addFinding(f);
      }
    }

    return this.findReviewById(data.id)!;
  }

  findReviewById(id: string): Review | null {
    const row = this.db.prepare("SELECT * FROM reviews WHERE id = ?").get(id);
    if (!row) return null;
    const findings = this.findFindingsByReviewId(id);
    return this.mapReviewRow(row, findings);
  }

  findReviewsByTaskId(taskId: string): Review[] {
    const rows = this.db.prepare("SELECT * FROM reviews WHERE task_id = ? ORDER BY created_at DESC").all(taskId);
    return rows.map((r: any) => {
      const findings = this.findFindingsByReviewId(r.id);
      return this.mapReviewRow(r, findings);
    });
  }

  updateReview(id: string, updates: Partial<Review>): Review {
    const existing = this.findReviewById(id);
    if (!existing) throw new NotFoundError("Review", id);

    const status = updates.status ?? existing.status;
    const summary = updates.summary !== undefined ? updates.summary : existing.summary;
    const completedAt = updates.completedAt !== undefined ? updates.completedAt : existing.completedAt;

    this.db.prepare(`
      UPDATE reviews SET status = ?, summary = ?, completed_at = ? WHERE id = ?
    `).run(status, summary || null, completedAt || null, id);

    return this.findReviewById(id)!;
  }

  addFinding(finding: ReviewFinding): ReviewFinding {
    const stmt = this.db.prepare(`
      INSERT INTO review_findings (
        id, review_id, severity, category, file, line, message, recommendation,
        evidence, status, introduced_commit, resolved_commit, resolved_at, resolved_by, resolution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      finding.id,
      finding.reviewId,
      finding.severity || "MEDIUM",
      finding.category || "CORRECTNESS",
      finding.file,
      finding.line ?? null,
      finding.message,
      finding.recommendation,
      finding.evidence || null,
      finding.status || "PENDING",
      finding.introducedCommit || null,
      finding.resolvedCommit || null,
      finding.resolvedAt || null,
      finding.resolvedBy || null,
      finding.resolution || null
    );
    return finding;
  }

  findFindingsByReviewId(reviewId: string): ReviewFinding[] {
    const rows = this.db.prepare("SELECT * FROM review_findings WHERE review_id = ? ORDER BY line ASC").all(reviewId);
    return rows.map((r: any) => this.mapFindingRow(r));
  }

  updateFinding(id: string, updates: Partial<ReviewFinding>): ReviewFinding {
    const row = this.db.prepare("SELECT * FROM review_findings WHERE id = ?").get(id);
    if (!row) throw new NotFoundError("ReviewFinding", id);
    const existing = this.mapFindingRow(row);

    const status = updates.status ?? existing.status;
    const resolvedCommit = updates.resolvedCommit !== undefined ? updates.resolvedCommit : existing.resolvedCommit;
    const resolvedAt = updates.resolvedAt !== undefined ? updates.resolvedAt : existing.resolvedAt;
    const resolvedBy = updates.resolvedBy !== undefined ? updates.resolvedBy : existing.resolvedBy;
    const resolution = updates.resolution !== undefined ? updates.resolution : existing.resolution;

    this.db.prepare(`
      UPDATE review_findings
      SET status = ?, resolved_commit = ?, resolved_at = ?, resolved_by = ?, resolution = ?
      WHERE id = ?
    `).run(status, resolvedCommit || null, resolvedAt || null, resolvedBy || null, resolution || null, id);

    const updatedRow = this.db.prepare("SELECT * FROM review_findings WHERE id = ?").get(id);
    return this.mapFindingRow(updatedRow);
  }
}
