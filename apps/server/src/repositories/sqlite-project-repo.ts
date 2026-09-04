import type { Project } from "@office/shared";
import { SqliteDatabase } from "../db/database";
import { ConcurrencyConflictError, NotFoundError, ProjectRepository } from "./types";

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private db: SqliteDatabase) {}

  private mapRow(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      repositoryUrl: row.repository_url || undefined,
      localPath: row.local_path,
      defaultBranch: row.default_branch,
      status: row.status as any,
      settings: JSON.parse(row.settings || "{}"),
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: Omit<Project, "revision">): Project {
    const revision = 1;
    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, description, repository_url, local_path, default_branch, status, settings, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      data.id,
      data.name,
      data.description || null,
      data.repositoryUrl || null,
      data.localPath,
      data.defaultBranch || "main",
      data.status || "ACTIVE",
      JSON.stringify(data.settings || {}),
      revision,
      data.createdAt,
      data.updatedAt
    );
    return { ...data, revision };
  }

  findById(id: string): Project | null {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    return row ? this.mapRow(row) : null;
  }

  findByPath(localPath: string): Project | null {
    const row = this.db.prepare("SELECT * FROM projects WHERE local_path = ?").get(localPath);
    return row ? this.mapRow(row) : null;
  }

  findAll(): Project[] {
    const rows = this.db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    return rows.map((r: any) => this.mapRow(r));
  }

  update(id: string, updates: Partial<Project>, expectedRevision?: number): Project {
    const existing = this.findById(id);
    if (!existing) {
      throw new NotFoundError("Project", id);
    }

    if (expectedRevision !== undefined && existing.revision !== expectedRevision) {
      throw new ConcurrencyConflictError("Project", id, expectedRevision, existing.revision);
    }

    const nextRevision = existing.revision + 1;
    const name = updates.name ?? existing.name;
    const description = updates.description !== undefined ? updates.description : existing.description;
    const repositoryUrl = updates.repositoryUrl !== undefined ? updates.repositoryUrl : existing.repositoryUrl;
    const localPath = updates.localPath ?? existing.localPath;
    const defaultBranch = updates.defaultBranch ?? existing.defaultBranch;
    const status = updates.status ?? existing.status;
    const settings = updates.settings ? JSON.stringify(updates.settings) : JSON.stringify(existing.settings);
    const updatedAt = updates.updatedAt || new Date().toISOString();

    const sql = `
      UPDATE projects
      SET name = ?, description = ?, repository_url = ?, local_path = ?, default_branch = ?, status = ?, settings = ?, revision = ?, updated_at = ?
      WHERE id = ? AND revision = ?
    `;
    const res = this.db.prepare(sql).run(
      name,
      description || null,
      repositoryUrl || null,
      localPath,
      defaultBranch,
      status,
      settings,
      nextRevision,
      updatedAt,
      id,
      existing.revision
    );

    if (res.changes === 0) {
      const current = this.findById(id);
      throw new ConcurrencyConflictError("Project", id, existing.revision, current?.revision ?? 0);
    }

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const res = this.db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    return res.changes > 0;
  }
}
