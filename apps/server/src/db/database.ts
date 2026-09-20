import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

export class SqliteDatabase {
  public readonly db: DatabaseSync;
  private inTransaction = false;

  constructor(filePath: string = ":memory:") {
    if (filePath !== ":memory:") {
      const dir = path.dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(filePath);
    this.initPragmas();
  }

  private initPragmas() {
    this.db.exec("PRAGMA foreign_keys = ON;");
    try {
      this.db.exec("PRAGMA journal_mode = WAL;");
    } catch {
      // In-memory or fallback
    }
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }

  public prepare(sql: string) {
    return this.db.prepare(sql);
  }

  public transaction<T>(fn: () => T): T {
    if (this.inTransaction) {
      return fn();
    }
    this.inTransaction = true;
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const result = fn();
      this.db.exec("COMMIT;");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK;");
      throw err;
    } finally {
      this.inTransaction = false;
    }
  }

  public close(): void {
    this.db.close();
  }
}

let defaultDbInstance: SqliteDatabase | null = null;

export function getDefaultDb(customPath?: string): SqliteDatabase {
  if (customPath) {
    return new SqliteDatabase(customPath);
  }
  if (!defaultDbInstance) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rootDir = existsSync(path.join(process.cwd(), "data"))
      ? process.cwd()
      : path.resolve(__dirname, "../../../..");
    const dbPath = path.join(rootDir, "data", "aioffice.db");
    defaultDbInstance = new SqliteDatabase(dbPath);
  }
  return defaultDbInstance;
}

export function createInMemoryDb(): SqliteDatabase {
  return new SqliteDatabase(":memory:");
}
