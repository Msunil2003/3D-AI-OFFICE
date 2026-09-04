import React, { useState, useEffect } from "react";
import { Plus, Users, CheckSquare, ExternalLink, HelpCircle } from "lucide-react";
import { useOfficeSocket } from "./hooks/useOfficeSocket";
import { OfficeScene } from "./components/OfficeScene";
import { Sidebar } from "./components/Sidebar";
import { SpawnModal } from "./components/SpawnModal";

export const App: React.FC = () => {
  const {
    connected,
    agents,
    tasks,
    sendChatMessage,
    spawnAgent,
    resetAgent,
    abortAgent,
    deleteAgent,
    getDiff
  } = useOfficeSocket();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);

  const selectedAgent = agents.find((a) => a.agentId === selectedAgentId) || null;

  // Keyboard shortcut: Escape to close sidebar or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSpawnModalOpen) {
          setIsSpawnModalOpen(false);
        } else if (selectedAgentId) {
          setSelectedAgentId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSpawnModalOpen, selectedAgentId]);

  return (
    <>
      {/* Glassmorphic Top Navbar */}
      <header className="top-nav">
        <div className="brand">
          <span className="brand-badge">3D</span>
          <h1 className="brand-title" style={{ margin: 0, fontSize: "16px" }}>AI Software Office</h1>
          <span className="brand-version">v0.2.0-beta</span>
        </div>

        <div className="nav-stats">
          <div className="stat-item">
            <span
              className={`connection-dot ${connected ? "" : "disconnected"}`}
              title={connected ? "Connected to AIOffice server" : "Disconnected"}
            />
            <span>{connected ? "Live System" : "Connecting..."}</span>
          </div>

          <div className="stat-item">
            <Users size={15} />
            <span>Engineers:</span>
            <span className="stat-value">{agents.length}</span>
          </div>

          <div className="stat-item">
            <CheckSquare size={15} />
            <span>Tasks:</span>
            <span className="stat-value">{tasks.length}</span>
          </div>
        </div>

        <div className="nav-actions">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="btn"
            title="Open original 2D Phaser view (Admin mode)"
          >
            <ExternalLink size={14} />
            2D Admin UI
          </a>

          <button
            className="btn btn-primary"
            onClick={() => setIsSpawnModalOpen(true)}
          >
            <Plus size={16} />
            Spawn Engineer
          </button>
        </div>
      </header>

      {/* 3D Office Scene */}
      <OfficeScene
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={(id) => setSelectedAgentId(id)}
        onDeselect={() => setSelectedAgentId(null)}
      />

      {/* View Controls Hint */}
      <div className="view-controls-hint">
        <HelpCircle size={14} color="var(--accent-cyan)" />
        <span>Rotate: <span className="key-badge">Left Click + Drag</span></span>
        <span>Pan: <span className="key-badge">Right Click + Drag</span></span>
        <span>Inspect: <span className="key-badge">Click Desk</span></span>
        <span>Deselect: <span className="key-badge">ESC</span></span>
      </div>

      {/* Sidebar Detail Inspector */}
      <Sidebar
        agent={selectedAgent}
        onClose={() => setSelectedAgentId(null)}
        onSendMessage={sendChatMessage}
        onResetAgent={resetAgent}
        onAbortAgent={abortAgent}
        onDeleteAgent={(id) => {
          deleteAgent(id);
          setSelectedAgentId(null);
        }}
        getDiff={getDiff}
      />

      {/* Spawn Engineer Modal */}
      <SpawnModal
        isOpen={isSpawnModalOpen}
        onClose={() => setIsSpawnModalOpen(false)}
        onSpawn={async (params) => {
          await spawnAgent(params);
        }}
      />
    </>
  );
};
