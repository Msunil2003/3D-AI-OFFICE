import type { Artifact } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { ArtifactRepository } from "./types";

export class SqliteArtifactRepository implements ArtifactRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): Artifact {
    return {
      id: row.id,
      type: row.type as any,
      projectId: row.project_id,
      taskId: row.task_id || undefined,
      storageType: row.storage_type as any,
      uri: row.uri,
      contentHash: row.content_hash || undefined,
      metadata: JSON.parse(row.metadata || "{}"),
      version: row.version,
      createdAt: row.created_at
    };
  }

  create(data: Artifact): Artifact {
    const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, type, project_id, task_id, storage_type, uri, content_hash, metadata, version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.type,
      data.projectId,
      data.taskId || null,
      data.storageType,
      data.uri,
      data.contentHash || null,
      JSON.stringify(data.metadata || {}),
      data.version ?? 1,
      data.createdAt
    );
    return data;
  }

  findById(id: string): Artifact | null {
    const row = this.db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByTaskId(taskId: string): Artifact[] {
    const rows = this.db.prepare("SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at DESC").all(taskId);
    return rows.map((r: any) => this.mapRow(r));
  }

  findByProjectId(projectId: string): Artifact[] {
    const rows = this.db.prepare("SELECT * FROM artifacts WHERE project_id = ? ORDER BY created_at DESC").all(projectId);
    return rows.map((r: any) => this.mapRow(r));
  }
}
