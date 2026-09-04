-- ===================================================
-- AIOFFICE SQLITE SCHEMA
-- ===================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  repository_url TEXT,
  local_path TEXT NOT NULL UNIQUE,
  default_branch TEXT NOT NULL DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  settings TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Agents
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'FULLSTACK',
  department TEXT NOT NULL DEFAULT 'Engineering',
  skills TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available',
  summary TEXT NOT NULL DEFAULT 'Ready',
  desk_x REAL NOT NULL DEFAULT 0,
  desk_y REAL NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'opencode',
  working_directory TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  last_seen TEXT NOT NULL
);

-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES agents(id),
  path TEXT NOT NULL UNIQUE,
  branch TEXT NOT NULL,
  worktree_id TEXT,
  status TEXT NOT NULL DEFAULT 'READY',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_task_id TEXT REFERENCES tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'FEATURE',
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'READY',
  blocked INTEGER NOT NULL DEFAULT 0,
  blocked_reason TEXT,
  blocked_by TEXT,
  blocked_at TEXT,
  assignee_id TEXT REFERENCES agents(id),
  workspace_id TEXT REFERENCES workspaces(id),
  branch TEXT,
  acceptance_criteria TEXT NOT NULL DEFAULT '[]',
  test_criteria TEXT NOT NULL DEFAULT '[]',
  risk TEXT NOT NULL DEFAULT 'LOW',
  complexity INTEGER NOT NULL DEFAULT 3,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'BLOCKS',
  PRIMARY KEY (task_id, depends_on_task_id)
);

-- Agent Assignments (with OCC)
CREATE TABLE IF NOT EXISTS agent_assignments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  workspace_id TEXT REFERENCES workspaces(id),
  assigned_by TEXT NOT NULL DEFAULT 'manager',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  reason TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  assigned_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_assignments_task ON agent_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_agent ON agent_assignments(agent_id);

-- Code Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES agents(id),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  summary TEXT,
  commit_hash TEXT NOT NULL,
  diff_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

-- Review Findings
CREATE TABLE IF NOT EXISTS review_findings (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'MEDIUM',
  category TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER,
  message TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  introduced_commit TEXT,
  resolved_commit TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution TEXT
);

-- Approvals
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_revision INTEGER NOT NULL,
  target_commit TEXT NOT NULL,
  target_diff_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  requester_id TEXT NOT NULL,
  approver_id TEXT,
  reason TEXT NOT NULL,
  risk TEXT NOT NULL DEFAULT 'MEDIUM',
  evidence TEXT NOT NULL DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  decision_notes TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  decided_at TEXT
);

-- Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  participants TEXT NOT NULL DEFAULT '[]',
  agenda TEXT NOT NULL DEFAULT '[]',
  outcomes TEXT NOT NULL DEFAULT '[]',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);

-- Collaboration Requests
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES agents(id),
  recipient_id TEXT NOT NULL REFERENCES agents(id),
  reason TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Strengthened Event Records (Ordered Monotonically Per Stream)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  sequence_number INTEGER NOT NULL,
  stream_id TEXT NOT NULL,
  causation_id TEXT,
  correlation_id TEXT,
  producer TEXT NOT NULL,
  schema_version TEXT NOT NULL DEFAULT '1.0',
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stream_seq ON events(stream_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_events_correlation ON events(correlation_id);

-- Immutable Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL,
  idempotency_key TEXT,
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Versatile Artifacts
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  storage_type TEXT NOT NULL,
  uri TEXT NOT NULL,
  content_hash TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
