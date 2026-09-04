import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Terminal as TermIcon, FileCode, X, Send, AlertOctagon, RotateCcw, Trash2 } from "lucide-react";
import { AgentData } from "../hooks/useOfficeSocket";
import { TerminalView } from "./TerminalView";
import { DiffView } from "./DiffView";

interface SidebarProps {
  agent: AgentData | null;
  onClose: () => void;
  onSendMessage: (agentId: string, text: string) => void;
  onResetAgent: (agentId: string) => void;
  onAbortAgent: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
  getDiff: (agentId: string) => Promise<string | null>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  agent,
  onClose,
  onSendMessage,
  onResetAgent,
  onAbortAgent,
  onDeleteAgent,
  getDiff
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "terminal" | "diff">("chat");
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agent?.messages]);

  if (!agent) {
    return <div className="sidebar-panel hidden" />;
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(agent.agentId, chatInput.trim());
    setChatInput("");
  };

  const providerName = agent.provider || agent.cliType || "claude-code";

  return (
    <div className="sidebar-panel">
      {/* Header */}
      <div className="sidebar-header">
        <div className="agent-info">
          <div className="agent-avatar-circle">🤖</div>
          <div>
            <div className="agent-meta-name">
              {agent.name}
              <span className={`provider-badge ${providerName}`}>{providerName}</span>
            </div>
            <div className="status-indicator">
              <span className={`status-dot ${agent.status}`} />
              <span>{agent.summary || agent.status}</span>
            </div>
          </div>
        </div>
        <button className="btn" onClick={onClose} style={{ padding: "6px" }} title="Close">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquare size={14} />
          Chat
        </button>
        <button
          className={`tab-btn ${activeTab === "terminal" ? "active" : ""}`}
          onClick={() => setActiveTab("terminal")}
        >
          <TermIcon size={14} />
          Terminal
        </button>
        <button
          className={`tab-btn ${activeTab === "diff" ? "active" : ""}`}
          onClick={() => setActiveTab("diff")}
        >
          <FileCode size={14} />
          Diff
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "chat" && (
          <>
            <div className="chat-messages">
              {agent.messages.length === 0 && (
                <div style={{ color: "var(--text-dim)", textAlign: "center", marginTop: "40px", fontSize: "13px" }}>
                  No messages yet. Send a prompt to start collaborating.
                </div>
              )}
              {agent.messages.map((msg, idx) => (
                <div key={idx} className={`message-bubble ${msg.channel}`}>
                  {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-bar" onSubmit={handleSend}>
              <input
                type="text"
                className="chat-input"
                placeholder={`Message ${agent.name}...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" title="Send">
                <Send size={15} />
              </button>
            </form>
          </>
        )}

        {activeTab === "terminal" && <TerminalView agentId={agent.agentId} />}

        {activeTab === "diff" && <DiffView agentId={agent.agentId} getDiff={getDiff} />}
      </div>

      {/* Footer Controls */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className="btn"
            onClick={() => onAbortAgent(agent.agentId)}
            title="Abort task execution"
          >
            <AlertOctagon size={14} />
            Abort
          </button>
          <button
            className="btn"
            onClick={() => onResetAgent(agent.agentId)}
            title="Reset agent session"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => onDeleteAgent(agent.agentId)}
          title="Remove agent from office"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
};
