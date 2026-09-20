import React from "react";
import { X, ShieldAlert, Cpu, Layers, GitBranch, ArrowRight, Activity, CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import { useOfficeStore } from "../state/officeStore";

export interface CEOConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineerCount?: number;
  taskCount?: number;
  blockedCount?: number;
  pendingGatesCount?: number;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    blocked?: boolean;
    blockReason?: string;
    assigneeId?: string;
  }>;
  onNavigateTo?: (pos: [number, number, number], floor: -1 | 0 | 1) => void;
}

export const CEOConsoleModal: React.FC<CEOConsoleModalProps> = ({
  isOpen,
  onClose,
  engineerCount = 0,
  taskCount = 0,
  blockedCount = 0,
  pendingGatesCount = 0,
  tasks = [],
  onNavigateTo
}) => {
  const teleportCeo = useOfficeStore((state) => state.teleportCeo);
  const setActiveModal = useOfficeStore((state) => state.setActiveModal);
  const setSelectedAgentId = useOfficeStore((state) => state.setSelectedAgentId);

  if (!isOpen) return null;

  const handleJump = (pos: [number, number, number], floor: -1 | 0 | 1) => {
    teleportCeo(pos, floor);
    onClose();
  };

  const completedCount = tasks.filter((t) => t.status === "DONE" || t.status === "VERIFIED").length;
  const activeTasksCount = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "TESTING" || t.status === "ASSIGNED").length;
  const blockedTasks = tasks.filter((t) => t.blocked);
  const topBlockedTask = blockedTasks[0];

  const healthStatus = blockedCount > 2 || pendingGatesCount > 2
    ? "at-risk"
    : blockedCount > 0 || pendingGatesCount > 0
    ? "attention"
    : "healthy";

  const healthLabel = healthStatus === "at-risk"
    ? "AT RISK"
    : healthStatus === "attention"
    ? "ATTENTION REQUIRED"
    : "HEALTHY";

  const healthNarrative = healthStatus === "at-risk"
    ? `Critical engineering bottlenecks detected: ${blockedCount} tasks halted and ${pendingGatesCount} governance gates pending review.`
    : healthStatus === "attention"
    ? `Operational attention advised: ${blockedCount > 0 ? `${blockedCount} task blocked in Engineering` : ""}${blockedCount > 0 && pendingGatesCount > 0 ? " and " : ""}${pendingGatesCount > 0 ? `${pendingGatesCount} production gate awaiting authorization` : ""}.`
    : "All autonomous engineering pods, CI/CD pipelines, and runtime processes are operating cleanly with zero blockers.";

  const topRisk = topBlockedTask
    ? `${topBlockedTask.title} (${topBlockedTask.blockReason || "dependency blocker"})`
    : pendingGatesCount > 0
    ? "Production Release Gate awaiting executive sign-off"
    : "None detected — autonomous sprint progressing on schedule";

  const recommendedActionLabel = pendingGatesCount > 0
    ? "Authorize Governance Gate"
    : blockedCount > 0
    ? "Inspect Blocked Workstation"
    : "Review Sprint Progress";

  const handleRecommendedAction = () => {
    if (pendingGatesCount > 0) {
      setActiveModal("governance-gate");
    } else if (blockedCount > 0 && topBlockedTask) {
      if (topBlockedTask.assigneeId) {
        setSelectedAgentId(topBlockedTask.assigneeId);
        setActiveModal("agent-talk");
      } else {
        setActiveModal("task-kanban");
      }
    } else {
      setActiveModal("task-kanban");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="ceo-console-modal">
      <div
        className="modal-container ceo-console-modal"
        id="ceo-console-modal"
        style={{ maxWidth: "680px", width: "94vw", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Command Center</div>
            <div className="modal-subtitle">Organization Health, executive briefing, and spatial navigation</div>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close (ESC)" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "var(--space-xl)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          {/* 1. Organization Health Banner */}
          <div
            className={`info-card org-health-banner ${healthStatus}`}
            style={{
              padding: "var(--space-md) var(--space-lg)",
              background: healthStatus === "healthy" ? "rgba(16,185,129,0.08)" : healthStatus === "attention" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${healthStatus === "healthy" ? "rgba(16,185,129,0.25)" : healthStatus === "attention" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: healthStatus === "healthy" ? "var(--accent-success)" : healthStatus === "attention" ? "var(--accent-warning)" : "var(--accent-danger)"
                  }}
                />
                <span style={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.04em", color: healthStatus === "healthy" ? "var(--accent-success)" : healthStatus === "attention" ? "var(--accent-warning)" : "var(--accent-danger)" }}>
                  ORGANIZATION HEALTH: {healthLabel}
                </span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: "1.45" }}>
              {healthNarrative}
            </p>
          </div>

          {/* 2. Daily CEO Briefing (Meaning before Metrics) */}
          <div className="info-card" style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            <div className="section-label">EXECUTIVE BRIEFING</div>

            {/* A. What Changed */}
            <div style={{ borderLeft: "2px solid var(--accent-info)", paddingLeft: "10px" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.04em" }}>WHAT CHANGED</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px", lineHeight: "1.4" }}>
                {completedCount > 0 ? `${completedCount} tasks verified and completed. ` : "Sprint in initial phase. "}
                {blockedCount > 0 ? `${blockedCount} task became blocked. ` : "0 blocking issues encountered. "}
                {pendingGatesCount > 0 ? `${pendingGatesCount} production deployment gate requires sign-off.` : "All pipelines clear."}
              </div>
            </div>

            {/* B. What Needs Attention & Top Risk */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.04em" }}>TOP RISK</div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: pendingGatesCount > 0 ? "var(--accent-warning)" : blockedCount > 0 ? "var(--accent-danger)" : "var(--text-primary)", marginTop: "2px", lineHeight: "1.3" }}>
                  {topRisk}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", fontWeight: 600, letterSpacing: "0.04em" }}>RECOMMENDED ACTION</div>
                <div style={{ marginTop: "2px" }}>
                  <button
                    className="action-btn primary"
                    onClick={handleRecommendedAction}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer"
                    }}
                  >
                    <span>{recommendedActionLabel}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* C. Supporting Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "var(--space-xs)", paddingTop: "var(--space-md)", borderTop: "1px solid var(--border-subtle)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-info)" }}>{engineerCount}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", fontWeight: 600 }}>ACTIVE AGENTS</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{activeTasksCount || taskCount}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", fontWeight: 600 }}>ACTIVE TASKS</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-success)" }}>{completedCount}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", fontWeight: 600 }}>COMPLETED</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: blockedCount > 0 ? "var(--accent-danger)" : "var(--accent-success)" }}>{blockedCount}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", fontWeight: 600 }}>BLOCKED</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: pendingGatesCount > 0 ? "var(--accent-warning)" : "var(--text-secondary)" }}>{pendingGatesCount}</div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", fontWeight: 600 }}>PENDING GATES</div>
              </div>
            </div>
          </div>

          {/* 3. Department Navigation Shortcuts */}
          <div>
            <div className="section-label" style={{ marginBottom: "var(--space-sm)" }}>GO TO DEPARTMENT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-sm)" }}>
              <div
                className="info-card"
                style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}
                onClick={() => handleJump([-13.5, 0, -4], 0)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="info-card-title">Engineering Wing</span>
                  <ArrowRight size={13} color="var(--text-tertiary)" />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Backend and frontend pods, active workstations
                </div>
              </div>

              <div
                className="info-card"
                style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}
                onClick={() => handleJump([12.5, 0, 5], 0)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="info-card-title">QA Automation Lab</span>
                  <ArrowRight size={13} color="var(--text-tertiary)" />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Automated test suites and regression monitors
                </div>
              </div>

              <div
                className="info-card"
                style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}
                onClick={() => handleJump([12.5, 0, -9], 0)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="info-card-title">DevOps Control</span>
                  <ArrowRight size={13} color="var(--text-tertiary)" />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  CI/CD deployment gates and infrastructure monitors
                </div>
              </div>

              <div
                className="info-card"
                style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px" }}
                onClick={() => handleJump([0, 4.2, -10], 1)}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="info-card-title">Strategy Rotunda</span>
                  <ArrowRight size={13} color="var(--text-tertiary)" />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Level +1 executive planning and roadmap review
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="footer-action-btn primary" onClick={onClose}>
            Close Command Center
          </button>
        </div>
      </div>
    </div>
  );
};
