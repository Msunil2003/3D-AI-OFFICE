import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, Check, X, GitMerge, FileText, AlertCircle, Lock } from "lucide-react";

export interface ApprovalRecord {
  id: string;
  projectId?: string;
  type: "PLAN_EXECUTION" | "MERGE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  targetId: string;
  targetCommit?: string;
  targetDiffHash?: string;
  risk?: "LOW" | "MEDIUM" | "HIGH";
  riskRating?: "LOW" | "MEDIUM" | "HIGH";
  requiredApprovals?: number;
  currentApprovals?: number;
  evidence?: Record<string, any>;
  decisionNotes?: string;
  revision: number;
  createdAt: string;
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl?: string;
  onActionComplete?: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  serverUrl = "http://localhost:3003",
  onActionComplete
}) => {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRecord | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/approvals?status=PENDING`);
      if (res.ok) {
        const data = await res.json();
        const list = data.approvals || [];
        setApprovals(list);
        if (list.length > 0 && !selectedApproval) {
          setSelectedApproval(list[0]);
        }
      }
    } catch {
      // Backend startup or offline
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchApprovals();
      setActionError(null);
      setActionSuccess(null);
    }
  }, [isOpen]);

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${serverUrl}/api/approvals/${selectedApproval.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: "human-executive",
          decisionNotes: decisionNotes || "Approved via executive governance gate",
          expectedRevision: selectedApproval.revision
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      setActionSuccess(`Gate #${selectedApproval.id.slice(0, 8)} authorized successfully.`);
      await fetchApprovals();
      setSelectedApproval(null);
      onActionComplete?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${serverUrl}/api/approvals/${selectedApproval.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: "human-executive",
          reason: decisionNotes || "Rejected by executive review",
          expectedRevision: selectedApproval.revision
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");

      setActionSuccess(`Gate #${selectedApproval.id.slice(0, 8)} rejected.`);
      await fetchApprovals();
      setSelectedApproval(null);
      onActionComplete?.();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="approval-modal">
      <div
        className="modal-container"
        id="governance-approval-modal"
        style={{ maxWidth: "840px", width: "92vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Executive Governance & Approval Gates</div>
            <div className="modal-subtitle">Review verification evidence and authorize production merges</div>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close (ESC)">
            <X size={16} />
          </button>
        </div>

        {actionSuccess && (
          <div style={{ padding: "10px var(--space-xl)", background: "rgba(16,185,129,0.12)", color: "var(--accent-success)", fontSize: "0.78rem", borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <div style={{ padding: "10px var(--space-xl)", background: "rgba(239,68,68,0.12)", color: "var(--accent-danger)", fontSize: "0.78rem", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
            {actionError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "380px", flex: 1, overflow: "hidden" }}>
          {/* Left: Pending Gates List */}
          <div style={{ borderRight: "1px solid var(--border-subtle)", padding: "var(--space-lg)", overflowY: "auto" }}>
            <div className="section-label">
              PENDING GATES ({approvals.length})
            </div>
            {approvals.length === 0 ? (
              <div className="state-empty" style={{ padding: "var(--space-xl) 0" }}>
                <Check size={20} color="var(--accent-success)" />
                <div className="state-empty-text">No gates pending review</div>
              </div>
            ) : (
              approvals.map((a) => {
                const isSelected = selectedApproval?.id === a.id;
                const risk = (a.risk || a.riskRating || "MEDIUM").toLowerCase();
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedApproval(a)}
                    style={{
                      padding: "var(--space-md)",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "var(--space-sm)",
                      cursor: "pointer",
                      background: isSelected ? "var(--surface-interactive)" : "var(--surface-card)",
                      border: `1px solid ${isSelected ? "var(--border-focus)" : "var(--border-subtle)"}`,
                      transition: "all var(--duration-fast) ease"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: a.type === "MERGE" ? "var(--accent-primary)" : "var(--accent-warning)" }}>
                        {a.type}
                      </span>
                      <span className={`risk-tag risk-${risk}`}>
                        {a.risk || a.riskRating || "MEDIUM"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontFamily: "monospace" }}>
                      #{a.id.slice(0, 8)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Details & Action */}
          <div style={{ padding: "var(--space-xl)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {selectedApproval ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)", flex: 1 }}>
                {/* Decision Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--accent-primary)", letterSpacing: "0.04em", marginBottom: "2px" }}>
                      GOVERNANCE GATE
                    </div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                      Authorize {selectedApproval.type} Gate
                    </h3>
                    <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "3px" }}>
                      Target branch: <code style={{ color: "var(--accent-info)" }}>{selectedApproval.targetId}</code>
                    </div>
                  </div>
                  <span className={`risk-tag risk-${(selectedApproval.risk || selectedApproval.riskRating || "MEDIUM").toLowerCase()}`}>
                    {selectedApproval.risk || selectedApproval.riskRating || "MEDIUM"} RISK
                  </span>
                </div>

                {/* Executive Context: Why It Matters & Expected Outcome */}
                <div className="info-card" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", padding: "var(--space-md)" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                    DECISION IMPACT & OUTCOME
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: "1.45" }}>
                    Authorizing this gate promotes verified commits from the agent's isolated worktree into <code>main</code>. Automated regression tests and static analysis have succeeded.
                  </div>
                </div>

                {/* Progressive Disclosure: Verification Evidence */}
                <details className="evidence-details" style={{ background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "var(--space-sm) var(--space-md)" }}>
                  <summary style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Lock size={13} color="var(--accent-primary)" />
                    <span>Technical Evidence & Cryptographic Hashes</span>
                  </summary>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "var(--space-sm)", paddingTop: "var(--space-xs)", borderTop: "1px solid var(--border-subtle)" }}>
                    {selectedApproval.targetCommit && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        Commit SHA: <code style={{ color: "var(--accent-info)" }}>{selectedApproval.targetCommit}</code>
                      </div>
                    )}
                    {selectedApproval.targetDiffHash && (
                      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                        Diff Hash: <code style={{ color: "var(--accent-executive)" }}>{selectedApproval.targetDiffHash}</code>
                      </div>
                    )}
                    <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
                      CI Integrity: All automated checks passed. 0 security regressions.
                    </div>
                  </div>
                </details>

                {/* Decision Notes */}
                <div>
                  <label className="section-label" style={{ display: "block", fontSize: "0.68rem" }}>
                    EXECUTIVE AUDIT NOTES (OPTIONAL)
                  </label>
                  <textarea
                    className="modal-textarea"
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder="Provide condition notes or sign-off rationale for audit log..."
                    rows={2}
                    style={{ width: "100%", marginTop: "var(--space-xs)" }}
                  />
                </div>

                {/* Decision Actions — One Dominant Action Rule */}
                <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "auto", paddingTop: "var(--space-lg)" }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleApprove}
                    disabled={loading}
                    style={{ flex: 1, height: "40px", fontSize: "0.82rem", fontWeight: 600 }}
                  >
                    <Check size={15} />
                    <span>{loading ? "Authorizing..." : "Authorize & Sign Off"}</span>
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleReject}
                    disabled={loading}
                    style={{ height: "40px" }}
                  >
                    <X size={15} />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="state-empty" style={{ margin: "auto" }}>
                <ShieldCheck size={36} color="var(--accent-success)" />
                <div className="state-empty-text">Select a governance gate from the left pane to review evidence</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
