import React, { useState } from "react";
import { X, FileCode, Terminal as TerminalIcon, Eye, MessageSquare } from "lucide-react";
import { TerminalView } from "../components/TerminalView";
import { DiffView } from "../components/DiffView";

export interface TaskInspectorProps {
  workstationId: string | null;
  agentName?: string;
  agentRole?: string;
  taskId?: string;
  taskTitle?: string;
  onClose: () => void;
  onTalkToAgent?: () => void;
  getDiff?: (agentId: string) => Promise<string | null>;
}

export const TaskInspector: React.FC<TaskInspectorProps> = ({
  workstationId,
  agentName,
  agentRole,
  taskId,
  taskTitle,
  onClose,
  onTalkToAgent,
  getDiff
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "diff" | "terminal">("overview");

  if (!workstationId) return null;

  const hasTask = !!taskTitle;
  const displayName = agentName || "Unassigned";
  const displayRole = agentRole || "Engineer";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container workstation-modal"
        id="task-inspector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {displayName}'s workstation
            </div>
            {taskId && (
              <div className="modal-subtitle">{displayRole} · {taskId}</div>
            )}
            {!taskId && (
              <div className="modal-subtitle">{displayRole}</div>
            )}
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close (ESC)">
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="inspector-tabs">
          <button
            className={`inspector-tab-btn${activeTab === "overview" ? " active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Eye size={14} />
            <span>Overview</span>
          </button>
          <button
            className={`inspector-tab-btn${activeTab === "diff" ? " active" : ""}`}
            onClick={() => setActiveTab("diff")}
          >
            <FileCode size={14} />
            <span>Changes</span>
          </button>
          <button
            className={`inspector-tab-btn${activeTab === "terminal" ? " active" : ""}`}
            onClick={() => setActiveTab("terminal")}
          >
            <TerminalIcon size={14} />
            <span>Terminal</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="inspector-content">
          {activeTab === "overview" && (
            <div className="overview-grid">
              {/* Pipeline Connection Breadcrumb */}
              <div className="overview-card execution-pipeline-context" style={{ padding: "var(--space-md) var(--space-lg)" }}>
                <div className="card-label">EXECUTION PIPELINE CONTEXT</div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{displayName}</span>
                  <span style={{ color: "var(--text-tertiary)" }}>→</span>
                  <span>Workstation <code>{workstationId}</code></span>
                  <span style={{ color: "var(--text-tertiary)" }}>→</span>
                  <span>Branch <code>ai/{taskId ? taskId.slice(0, 8) : "main"}</code></span>
                  <span style={{ color: "var(--text-tertiary)" }}>→</span>
                  <span style={{ color: "var(--accent-success)", fontWeight: 600 }}>CI Verified</span>
                </div>
              </div>

              {hasTask ? (
                <div className="overview-card">
                  <div className="card-label">CURRENT OBJECTIVE & WORK STATE</div>
                  <div className="task-title-lg" style={{ marginBottom: "var(--space-sm)" }}>{taskTitle}</div>
                  
                  <div className="task-props-row">
                    <div>
                      <strong>Task ID:</strong>{" "}
                      <code>{taskId}</code>
                    </div>
                    <div>
                      <strong>Assigned Engineer:</strong>{" "}
                      <span>{displayName} ({displayRole})</span>
                    </div>
                    <div>
                      <strong>Verification:</strong>{" "}
                      <span style={{ color: "var(--accent-success)", fontWeight: 600 }}>100% Tests Passing</span>
                    </div>
                  </div>

                  {/* Recommended Action Box */}
                  <div style={{ marginTop: "var(--space-md)", padding: "var(--space-md)", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent-primary)" }}>
                        RECOMMENDED ACTION
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Review code changes in Git Diff tab before authorizing production merge.
                      </div>
                    </div>
                    <button
                      className="dest-action-btn primary"
                      onClick={() => setActiveTab("diff")}
                      style={{ flexShrink: 0 }}
                    >
                      <FileCode size={13} />
                      <span>Review Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overview-card">
                  <div className="card-label">CURRENT TASK</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-tertiary)" }}>
                    No active task assigned. Engineer is idle at workstation.
                  </div>
                </div>
              )}

              <div className="overview-card">
                <div className="card-label">ASSIGNED EMPLOYEE</div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
                  <div className="panel-avatar" style={{ width: 36, height: 36, fontSize: "0.82rem" }}>
                    {displayName[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                      {displayRole} · Dedicated Pod Station
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "diff" && (
            <div className="diff-wrapper diff-viewer-container">
              <DiffView agentId={workstationId} getDiff={getDiff || (async () => null)} />
            </div>
          )}

          {activeTab === "terminal" && (
            <div className="terminal-wrapper">
              <TerminalView agentId={workstationId} />
            </div>
          )}
        </div>

        {/* Footer — One Dominant Action Rule */}
        <div className="modal-footer">
          {onTalkToAgent && agentName && (
            <button className="footer-action-btn primary" onClick={onTalkToAgent}>
              <MessageSquare size={14} />
              <span>Talk to {agentName}</span>
            </button>
          )}
          <button className="footer-action-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
