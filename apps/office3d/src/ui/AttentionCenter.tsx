import React, { useEffect, useState, useCallback } from "react";
import { X, ShieldAlert, AlertTriangle, Calendar, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { useOfficeStore } from "../state/officeStore";

interface AttentionItem {
  id: string;
  category: "approval" | "task" | "meeting";
  categoryLabel: string;
  severity: "critical" | "warning" | "info";
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  reason: string;
  who: string;
  actionLabel: string;
  action: () => void;
}

export const AttentionCenter: React.FC = () => {
  const attentionOpen = useOfficeStore((state) => state.attentionOpen);
  const setAttentionOpen = useOfficeStore((state) => state.setAttentionOpen);
  const setActiveModal = useOfficeStore((state) => state.setActiveModal);
  const setSelectedAgentId = useOfficeStore((state) => state.setSelectedAgentId);
  const activeMeeting = useOfficeStore((state) => state.activeMeeting);

  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttentionItems = useCallback(async () => {
    setLoading(true);
    const collected: AttentionItem[] = [];

    try {
      // 1. Approvals awaiting executive review (Highest priority)
      const apprRes = await fetch("http://localhost:3003/api/approvals?status=PENDING");
      if (apprRes.ok) {
        const apprData = await apprRes.json();
        const pending = apprData.approvals || [];
        for (const a of pending) {
          const risk = (a.risk || a.riskRating || "MEDIUM").toUpperCase() as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
          collected.push({
            id: `appr-${a.id}`,
            category: "approval",
            categoryLabel: "DECISION REQUIRED",
            severity: "critical",
            impact: risk,
            title: `Approval Required: ${a.type || "MERGE"} Gate #${a.id.slice(0, 8)}`,
            reason: a.targetCommit
              ? `Commit ${a.targetCommit.slice(0, 8)} passed verification tests and requires executive merge sign-off.`
              : `Target #${a.targetId || a.id.slice(0, 8)} awaiting governance authorization.`,
            who: `Target: ${a.targetId || "Main branch"}`,
            actionLabel: "Review & Authorize",
            action: () => {
              setAttentionOpen(false);
              setActiveModal("governance-gate");
            }
          });
        }
      }
    } catch {
      // Server unreachable
    }

    try {
      // 2. Blocked engineering tasks
      const taskRes = await fetch("http://localhost:3003/api/tasks");
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        const tasks = taskData.tasks || [];
        const blocked = tasks.filter((t: any) => t.blocked);
        for (const b of blocked) {
          collected.push({
            id: `task-blocked-${b.id}`,
            category: "task",
            categoryLabel: "BLOCKED WORK",
            severity: "warning",
            impact: "HIGH",
            title: `Engineering Task Blocked: ${b.title}`,
            reason: b.blockReason || b.blockedReason || "Execution halted pending external dependency or executive resolution.",
            who: `Owner: ${b.assigneeId || "Unassigned"} · Task #${b.id.slice(0, 8)}`,
            actionLabel: "Inspect Workstation",
            action: () => {
              setAttentionOpen(false);
              if (b.assigneeId) {
                setSelectedAgentId(b.assigneeId);
              }
              setActiveModal("workstation-inspect");
            }
          });
        }
      }
    } catch {
      // Server unreachable
    }

    // 3. Active collaborative session
    if (activeMeeting && activeMeeting.status === "IN_PROGRESS") {
      collected.push({
        id: `meet-${activeMeeting.id}`,
        category: "meeting",
        categoryLabel: "IN SESSION",
        severity: "info",
        impact: "MEDIUM",
        title: `Team Meeting: ${activeMeeting.title}`,
        reason: `${activeMeeting.participants?.length || 0} agents assembled in Conference Room A for architectural alignment.`,
        who: `Room: Conference Room A · ${activeMeeting.type || "Strategy"}`,
        actionLabel: "Join Meeting",
        action: () => {
          setAttentionOpen(false);
          setActiveModal("meeting-scheduler");
        }
      });
    }

    // Sort by severity: critical > warning > info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    collected.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    setItems(collected);
    setLoading(false);
  }, [activeMeeting, setActiveModal, setAttentionOpen, setSelectedAgentId]);

  useEffect(() => {
    if (attentionOpen) {
      fetchAttentionItems();
    }
  }, [attentionOpen, fetchAttentionItems]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && attentionOpen) {
        setAttentionOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [attentionOpen, setAttentionOpen]);

  if (!attentionOpen) return null;

  return (
    <div className="attention-overlay" id="attention-center" data-testid="attention-center">
      <div className="attention-header">
        <div>
          <div className="attention-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Your Attention</span>
            {items.length > 0 && (
              <span className="attention-count-badge">{items.length}</span>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", marginTop: "2px" }}>
            Decisions, blocked work, and operational escalations
          </div>
        </div>
        <button
          className="panel-close-btn"
          onClick={() => setAttentionOpen(false)}
          title="Close (ESC)"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="attention-list">
        {loading ? (
          <div className="state-loading">
            <div className="state-loading-text">Assessing organization state...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="attention-empty" style={{ padding: "var(--space-2xl) var(--space-lg)" }}>
            <CheckCircle2 size={28} color="var(--accent-success)" style={{ margin: "0 auto 10px", display: "block" }} />
            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.85rem", marginBottom: "4px" }}>
              No decisions require your attention
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              All engineering workflows, agent tasks, and automated tests are executing autonomously.
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`attention-decision-card severity-${item.severity}`}
              onClick={item.action}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") item.action(); }}
            >
              <div className="card-top-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span className={`category-tag category-${item.category}`}>
                  {item.categoryLabel}
                </span>
                <span className={`impact-badge impact-${item.impact.toLowerCase()}`}>
                  {item.impact} IMPACT
                </span>
              </div>

              <div className="decision-title" style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                {item.title}
              </div>

              <div className="decision-reason" style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: "1.4", marginBottom: "8px" }}>
                {item.reason}
              </div>

              <div className="decision-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-tertiary)", fontFamily: "monospace" }}>
                  {item.who}
                </span>
                <button
                  className="decision-action-btn primary"
                  onClick={(e) => { e.stopPropagation(); item.action(); }}
                >
                  <span>{item.actionLabel}</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
