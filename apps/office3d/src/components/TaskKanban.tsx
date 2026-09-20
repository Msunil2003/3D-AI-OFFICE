import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  GitBranch,
  X,
  Play,
  RotateCcw,
  Eye,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

export interface DomainTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: "READY" | "ASSIGNED" | "IN_PROGRESS" | "TESTING" | "READY_FOR_REVIEW" | "IN_REVIEW" | "APPROVAL" | "DONE" | "BLOCKED";
  branch?: string;
  risk?: string;
  complexity?: number;
  blocked?: boolean;
  blockedReason?: string;
  assigneeId?: string;
  revision: number;
}

interface TaskKanbanProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl?: string;
  onInspectTask?: (task: DomainTask) => void;
}

const COLUMNS: { key: string; title: string; statuses: string[]; color: string }[] = [
  { key: "ready", title: "Ready / Assigned", statuses: ["READY", "ASSIGNED"], color: "#38bdf8" },
  { key: "progress", title: "In Progress / Testing", statuses: ["IN_PROGRESS", "TESTING"], color: "#818cf8" },
  { key: "review", title: "In Review / Approval", statuses: ["READY_FOR_REVIEW", "IN_REVIEW", "APPROVAL"], color: "#f59e0b" },
  { key: "done", title: "Done / Completed", statuses: ["DONE"], color: "#10b981" }
];

export const TaskKanban: React.FC<TaskKanbanProps> = ({
  isOpen,
  onClose,
  serverUrl = "http://localhost:3003",
  onInspectTask
}) => {
  const [tasks, setTasks] = useState<DomainTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container kanban-modal"
        id="task-kanban-modal"
        style={{ maxWidth: "1100px", width: "95vw", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="brand-badge">KANBAN</span>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Organization Task Board</h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              ({tasks.length} total tasks)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={fetchTasks}
              disabled={loading}
              title="Refresh tasks"
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              Refresh
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: "12px 20px", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {/* Kanban Board Columns */}
        <div className="kanban-grid">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => col.statuses.includes(t.status));
            return (
              <div key={col.key} className="kanban-column">
                <div className="kanban-column-header">
                  <span className="col-indicator" style={{ background: col.color }} />
                  <span className="col-title">{col.title}</span>
                  <span className="col-count">{columnTasks.length}</span>
                </div>

                <div className="kanban-column-body">
                  {columnTasks.length === 0 ? (
                    <div className="kanban-empty">No tasks in stage</div>
                  ) : (
                    columnTasks.map((t) => (
                      <div
                        key={t.id}
                        className={`kanban-card ${t.blocked ? "card-blocked" : ""}`}
                        onClick={() => onInspectTask?.(t)}
                      >
                        <div className="card-top">
                          <span className="card-badge" style={{ borderColor: col.color, color: col.color }}>
                            {t.type || "TASK"}
                          </span>
                          {t.risk && (
                            <span className={`risk-tag risk-${t.risk.toLowerCase()}`}>
                              {t.risk}
                            </span>
                          )}
                        </div>

                        <div className="card-title">{t.title}</div>

                        {t.description && (
                          <div className="card-desc">
                            {t.description.length > 90
                              ? `${t.description.substring(0, 90)}...`
                              : t.description}
                          </div>
                        )}

                        {t.branch && (
                          <div className="card-branch">
                            <GitBranch size={12} />
                            <span>{t.branch}</span>
                          </div>
                        )}

                        {t.blocked && (
                          <div className="card-blocked-banner">
                            <AlertTriangle size={12} />
                            <span>{t.blockedReason || "Blocked"}</span>
                          </div>
                        )}

                        <div className="card-footer">
                          <span className="task-id">#{t.id.slice(0, 8)}</span>
                          <span className="task-status" style={{ color: col.color }}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
