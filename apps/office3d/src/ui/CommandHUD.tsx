import React from "react";
import { Search, Map, Eye, EyeOff, Bell } from "lucide-react";
import { useOfficeStore } from "../state/officeStore";

export interface CommandHUDProps {
  connected: boolean;
  engineerCount: number;
  taskCount: number;
  blockedCount: number;
  pendingGatesCount: number;
  onOpenPlanning: () => void;
  onOpenKanban: () => void;
  onOpenApprovals: () => void;
  onOpenSpawn: () => void;
  onOpenMap: () => void;
  onOpenMeeting: () => void;
}

export const CommandHUD: React.FC<CommandHUDProps> = ({
  connected,
  blockedCount,
  pendingGatesCount,
  onOpenMap
}) => {
  const focusMode = useOfficeStore((state) => state.focusMode);
  const toggleFocusMode = useOfficeStore((state) => state.toggleFocusMode);
  const locationLabel = useOfficeStore((state) => state.locationLabel);
  const searchOpen = useOfficeStore((state) => state.searchOpen);
  const setSearchOpen = useOfficeStore((state) => state.setSearchOpen);
  const attentionOpen = useOfficeStore((state) => state.attentionOpen);
  const setAttentionOpen = useOfficeStore((state) => state.setAttentionOpen);

  const attentionCount = blockedCount + pendingGatesCount;

  // Organization Health computation based on authoritative state
  const healthStatus = blockedCount > 2 || pendingGatesCount > 2
    ? "at-risk"
    : blockedCount > 0 || pendingGatesCount > 0
    ? "attention"
    : "healthy";

  const healthLabel = healthStatus === "at-risk"
    ? "At Risk"
    : healthStatus === "attention"
    ? "Attention"
    : "Healthy";

  const healthDetail = healthStatus === "at-risk"
    ? `${blockedCount} blocked · ${pendingGatesCount} gates pending`
    : healthStatus === "attention"
    ? `${blockedCount > 0 ? `${blockedCount} blocked` : ""}${blockedCount > 0 && pendingGatesCount > 0 ? " · " : ""}${pendingGatesCount > 0 ? `${pendingGatesCount} gate pending` : ""}`
    : "All systems operating normally";

  return (
    <header className={`executive-bar${focusMode ? " focus-hidden" : ""}`}>
      {/* Identity + Connection */}
      <div className="bar-identity">
        <span className="bar-mark">
          AIOffice
          <span className="hud-title sr-only" style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}>
            AIOFFICE HQ
          </span>
        </span>
        <span className={`bar-connection${connected ? "" : " offline"}`} title={connected ? "Connected to backend (:3003)" : "Disconnected"} />
      </div>

      <div className="bar-separator" />

      {/* Location breadcrumb */}
      <span className="bar-location">{locationLabel}</span>

      {/* Right actions */}
      <div className="bar-actions">
        {/* Organization Health Pill */}
        <div
          className={`org-health-pill ${healthStatus}`}
          title={`Organization Health: ${healthLabel} (${healthDetail})`}
        >
          <span className="health-dot" />
          <span>{healthLabel}</span>
        </div>

        {/* Attention */}
        <button
          className="bar-btn has-badge"
          onClick={() => setAttentionOpen(!attentionOpen)}
          title={attentionCount > 0 ? `Your attention (${attentionCount} item${attentionCount > 1 ? "s" : ""})` : "Your attention"}
          aria-label="Your attention"
        >
          <Bell size={14} />
          {attentionCount > 0 && (
            <span className={`attention-badge${blockedCount > 0 ? "" : " warning"}`}>
              {attentionCount}
            </span>
          )}
        </button>

        {/* Command Palette */}
        <button
          className="bar-btn"
          onClick={() => setSearchOpen(!searchOpen)}
          title="Command Palette (Ctrl+K)"
          aria-label="Command Palette (Ctrl+K)"
        >
          <Search size={14} />
        </button>

        {/* Directory */}
        <button
          className="bar-btn"
          onClick={onOpenMap}
          title="Directory (Campus map)"
          aria-label="Directory"
        >
          <Map size={14} />
        </button>

        {/* Immersive mode toggle (Tab) */}
        <button
          className="bar-btn"
          onClick={toggleFocusMode}
          title={focusMode ? "Exit Immersive Mode (Tab)" : "Immersive Mode (Tab)"}
          aria-label="Immersive Mode"
        >
          {focusMode ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </header>
  );
};
