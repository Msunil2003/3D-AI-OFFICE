import { existsSync, readFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { SqliteDatabase } from "./database";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations(db: SqliteDatabase): { migratedAgents: number; migratedTasks: number } {
  let schemaPath = path.join(__dirname, "schema.sql");
  if (!existsSync(schemaPath)) {
    schemaPath = path.join(process.cwd(), "apps", "server", "src", "db", "schema.sql");
  }
  if (!existsSync(schemaPath)) {
    schemaPath = path.join(process.cwd(), "src", "db", "schema.sql");
  }

  if (existsSync(schemaPath)) {
    const schemaSql = readFileSync(schemaPath, "utf-8");
    db.exec(schemaSql);
  } else {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  let migratedAgents = 0;
  let migratedTasks = 0;

  // Check for legacy data files
  const rootDir = existsSync(path.join(process.cwd(), "data"))
    ? process.cwd()
    : path.resolve(__dirname, "../../../..");
  const dataDir = path.join(rootDir, "data");
  const agentsPath = path.join(dataDir, "agents.json");
  const tasksPath = path.join(dataDir, "tasks.json");

  // Ensure default project exists for legacy tasks
  const now = new Date().toISOString();
  const defaultProjectStmt = db.prepare(`
    INSERT OR IGNORE INTO projects (id, name, description, local_path, default_branch, status, settings, revision, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  defaultProjectStmt.run(
    "default-project",
    "Default Project",
    "Legacy migrated project",
    rootDir,
    "main",
    "ACTIVE",
    "{}",
    1,
    now,
    now
  );

  // Migrate agents
  if (existsSync(agentsPath)) {
    try {
      const raw = readFileSync(agentsPath, "utf-8");
      if (raw.trim()) {
        const legacyAgents = JSON.parse(raw);
        if (Array.isArray(legacyAgents)) {
          const insertAgentStmt = db.prepare(`
            INSERT OR IGNORE INTO agents (id, name, role, department, skills, status, summary, desk_x, desk_y, provider, working_directory, revision, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const a of legacyAgents) {
            if (a.agentId) {
              const res = insertAgentStmt.run(
                a.agentId,
                a.name || a.agentId,
                a.role || "FULLSTACK",
                "Engineering",
                JSON.stringify(a.skills || {}),
                a.status || "available",
                a.summary || "Ready",
                a.desk?.x ?? 0,
                a.desk?.y ?? 0,
                a.provider || a.cliType || "opencode",
                a.workingDirectory || "",
                1,
                a.lastSeen || now
              );
              if (res.changes > 0) migratedAgents++;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[migrations] Warning while migrating legacy agents:", e);
    }
  }

  // Migrate tasks
  if (existsSync(tasksPath)) {
    try {
      const raw = readFileSync(tasksPath, "utf-8");
      if (raw.trim()) {
        const legacyTasks = JSON.parse(raw);
        if (Array.isArray(legacyTasks)) {
          const insertTaskStmt = db.prepare(`
            INSERT OR IGNORE INTO tasks (id, project_id, title, description, type, priority, status, blocked, assignee_id, revision, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const t of legacyTasks) {
            if (t.taskId) {
              const res = insertTaskStmt.run(
                t.taskId,
                "default-project",
                t.title || "Legacy Task",
                t.details || "",
                "FEATURE",
                "MEDIUM",
                t.status === "done" ? "DONE" : "ASSIGNED",
                0,
                t.agentId || null,
                1,
                t.createdAt || now,
                now
              );
              if (res.changes > 0) migratedTasks++;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[migrations] Warning while migrating legacy tasks:", e);
    }
  }

  return { migratedAgents, migratedTasks };
}
