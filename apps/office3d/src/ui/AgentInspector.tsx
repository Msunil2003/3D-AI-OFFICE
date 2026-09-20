import React, { useState } from "react";
import { X, Send, Eye, GitPullRequest, Terminal, Users, ArrowLeft } from "lucide-react";
import { AgentData } from "../hooks/useOfficeSocket";
import { getAgentVisualBehavior } from "../state/AgentBehaviorMap";
import { useOfficeStore } from "../state/officeStore";

export interface AgentInspectorProps {
  agent: AgentData | null;
  onClose: () => void;
  onSendMessage: (agentId: string, text: string) => void;
  onInspectWork?: () => void;
  onViewDiff?: () => void;
  onViewTerminal?: () => void;
  onCallToMeeting?: () => void;
  currentTaskTitle?: string;
}

type InspectorTab = "overview" | "work" | "terminal" | "activity";

export const AgentInspector: React.FC<AgentInspectorProps> = ({
  agent,
  onClose,
  onSendMessage,
  onInspectWork,
  onViewDiff,
  onViewTerminal,
  onCallToMeeting
}) => {
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<InspectorTab>("overview");
  const panelHistory = useOfficeStore((state) => state.panelHistory);
  const popPanel = useOfficeStore((state) => state.popPanel);

  if (!agent) return null;

  const behavior = getAgentVisualBehavior(agent.status);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(agent.agentId, chatInput.trim());
    setChatInput("");
  };

  const handleBack = () => {
    if (panelHistory.length > 0) {
      popPanel();
    } else {
      onClose();
    }
  };

  const roleName = (agent as any).role || agent.summary || "Software Engineer";
  const runtimeLabel = agent.provider || "claude";

  // Extract task title from agent's current assignment if available
  const taskTitle = (agent as any).currentTask || null;

  const isBlocked = agent.status === "blocked" || agent.status === "error";

  return (
    <aside className="contextual-panel agent-inspector-panel" id="agent-inspector" aria-label="Agent Workspace">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-header-left">
          {panelHistory.length > 0 && (
            <button className="panel-close" onClick={handleBack} title="Back" aria-label="Back">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="panel-avatar" style={{ borderColor: behavior.color }}>
            {agent.name?.[0] || "A"}
          </div>
          <div className="panel-title-group">
            <div className="panel-title">Agent Workspace</div>
            <div className="panel-subtitle">{agent.name} · {roleName}</div>
          </div>
        </div>
        <button className="panel-close" onClick={onClose} title="Close (ESC)" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button
          className={`panel-tab${activeTab === "overview" ? " active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`panel-tab${activeTab === "work" ? " active" : ""}`}
          onClick={() => setActiveTab("work")}
        >
          Work
        </button>
        <button
          className={`panel-tab${activeTab === "terminal" ? " active" : ""}`}
          onClick={() => setActiveTab("terminal")}
        >
          Terminal
        </button>
        <button
          className={`panel-tab${activeTab === "activity" ? " active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          Activity
        </button>
      </div>

      {/* Panel Body */}
      <div className="panel-body">
        {activeTab === "overview" && (
          <>
            {/* Executive Summary Card */}
            <div className="panel-section">
              <div className="agent-executive-summary" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{agent.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>{roleName} · {runtimeLabel}</div>
                  </div>
                  <div
                    className="status-chip"
                    style={{
                      backgroundColor: `${behavior.color}14`,
                      borderColor: `${behavior.color}40`,
                      color: behavior.color
                    }}
                  >
                    <span className="status-dot" style={{ backgroundColor: behavior.color }} />
                    {behavior.label}
                  </div>
                </div>

                <div style={{ padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div className="section-label" style={{ fontSize: "0.62rem", marginBottom: "4px" }}>CURRENT ASSIGNMENT</div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "6px" }}>
                    {taskTitle || "Operating autonomously on baseline codebase"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: isBlocked ? "var(--accent-danger)" : "var(--text-secondary)" }}>
                    <strong>CEO Action:</strong> {isBlocked ? "Review blocked workstation" : "None required — operating autonomously"}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Grid — One Primary Action Rule */}
            <div className="panel-section">
              <div className="actions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-sm)" }}>
                <button
                  className="action-btn primary"
                  onClick={onInspectWork}
                  style={{ gridColumn: "span 2", display: "flex", justifyContent: "center", gap: "6px" }}
                >
                  <Eye size={13} />
                  <span>Open Workstation</span>
                  <span style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}>Inspect Workstation</span>
                </button>
                <button className="action-btn" onClick={onViewDiff}>
                  <GitPullRequest size={13} />
                  <span>Review Changes</span>
                </button>
                <button className="action-btn" onClick={onViewTerminal}>
                  <Terminal size={13} />
                  <span>Terminal</span>
                </button>
                <button
                  className="action-btn"
                  onClick={onCallToMeeting}
                  style={{ gridColumn: "span 2" }}
                >
                  <Users size={13} />
                  <span>Invite to Meeting</span>
                </button>
              </div>
            </div>

            {/* Recent Output (Secondary Context) */}
            {agent.messages && agent.messages.length > 0 && (
              <div className="panel-section">
                <div className="section-label">LATEST AGENT OUTPUT</div>
                <div className="info-card" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", maxHeight: "90px", overflowY: "auto" }}>
                  "{agent.messages[agent.messages.length - 1].text.slice(0, 240)}"
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "work" && (
          <div className="panel-section">
            <div className="section-label">Work details</div>
            {taskTitle ? (
              <div className="info-card">
                <div className="info-card-title">{taskTitle}</div>
                <div className="info-card-meta">
                  <span className="meta-tag">{runtimeLabel}</span>
                </div>
                <div style={{ marginTop: "var(--space-md)" }}>
                  <button className="action-btn primary" onClick={onInspectWork} style={{ width: "100%" }}>
                    <Eye size={13} />
                    Open workstation
                  </button>
                </div>
              </div>
            ) : (
              <div className="state-empty">
                <div className="state-empty-text">No active work to display</div>
              </div>
            )}
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="panel-section">
            <div className="section-label">Terminal session</div>
            <button className="action-btn primary" onClick={onViewTerminal} style={{ width: "100%" }}>
              <Terminal size={13} />
              Open terminal
            </button>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="panel-section">
            <div className="section-label">Recent activity</div>
            {agent.messages && agent.messages.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {agent.messages.slice(-10).reverse().map((msg, i) => (
                  <div key={i} className="info-card" style={{ fontSize: "0.75rem" }}>
                    <div style={{ color: "var(--text-tertiary)", fontSize: "0.65rem", marginBottom: "4px" }}>
                      {msg.channel === "reply" ? agent.name : msg.channel.toUpperCase()}
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {msg.text.slice(0, 200)}{msg.text.length > 200 ? "…" : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="state-empty">
                <div className="state-empty-text">No recent activity</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat input — always available at bottom */}
      <div className="panel-footer">
        <form className="chat-form" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-input"
            placeholder={`Message ${agent.name}…`}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" className="chat-send">
            <Send size={14} />
          </button>
        </form>
      </div>
    </aside>
  );
};
