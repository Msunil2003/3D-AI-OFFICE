import React, { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight, Shield, Users, Layers, X, AlertCircle } from "lucide-react";

interface PlanningDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl?: string;
  onPlanApproved?: () => void;
}

export const PlanningDashboard: React.FC<PlanningDashboardProps> = ({
  isOpen,
  onClose,
  serverUrl = "http://localhost:3003",
  onPlanApproved
}) => {
  const [goalPrompt, setGoalPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  const [planApproved, setPlanApproved] = useState(false);

  const handleProposePlan = async () => {
    if (!goalPrompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      // First ensure default project exists or get projects
      const projRes = await fetch(`${serverUrl}/api/projects`);
      const projData = await projRes.json();
      let projectId = projData.projects?.[0]?.id;

      if (!projectId) {
        const createProj = await fetch(`${serverUrl}/api/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "AIOffice Core", defaultBranch: "main" })
        });
        const created = await createProj.json();
        projectId = created.project.id;
      }

      const res = await fetch(`${serverUrl}/api/planning/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: goalPrompt,
          initiatorId: "human-executive"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate plan");

      setGeneratedPlan(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!generatedPlan?.artifact?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${serverUrl}/api/planning/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: generatedPlan.artifact.id,
          approverId: "human-executive",
          autoAssign: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve plan");

      setPlanApproved(true);
      onPlanApproved?.();
    } catch (err: any) {
      setError(err.message || "Failed to approve plan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        id="planning-dashboard-modal"
        style={{ maxWidth: "850px", width: "92vw", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="brand-badge badge-accent">ORCHESTRATION</span>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>AI Engineering Manager & Planning</h2>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 20px", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <div style={{ padding: "20px", overflowY: "auto", maxHeight: "calc(90vh - 120px)" }}>
          {/* Prompt Section */}
          {!generatedPlan ? (
            <div>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "15px", lineHeight: "1.5" }}>
                Prompt the autonomous Engineering Manager to analyze requirements, decompose technical milestones into discrete tasks, evaluate risk levels, and recommend optimal agent roles.
              </p>

              <div style={{ marginBottom: "15px" }}>
                <textarea
                  value={goalPrompt}
                  onChange={(e) => setGoalPrompt(e.target.value)}
                  placeholder="e.g. Implement real-time WebSocket notifications with reconnect backoff and typing indicators..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "0.9rem",
                    resize: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleProposePlan}
                  disabled={loading || !goalPrompt.trim()}
                >
                  <Sparkles size={16} />
                  {loading ? "Synthesizing Plan..." : "Generate Execution Plan"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Generated Plan Overview */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                    {generatedPlan.plan?.goal || "Engineering Execution Plan"}
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {generatedPlan.plan?.tasks?.length || 0} subtasks decomposed • Plan #{generatedPlan.artifact?.id?.slice(0, 8)}
                  </span>
                </div>

                {planApproved ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
                    <CheckCircle2 size={16} /> Approved & Provisioned
                  </span>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={handleApprovePlan}
                    disabled={loading}
                    style={{ background: "#10b981", borderColor: "#10b981" }}
                  >
                    <CheckCircle2 size={16} />
                    {loading ? "Provisioning..." : "Approve & Auto-Assign"}
                  </button>
                )}
              </div>

              {/* Architectural Summary */}
              {generatedPlan.plan?.architecturalSummary && (
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "6px", marginBottom: "15px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-primary)", marginBottom: "6px" }}>
                    Architectural Strategy
                  </div>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {generatedPlan.plan.architecturalSummary}
                  </p>
                </div>
              )}

              {/* Tasks List */}
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "10px" }}>
                  DECOMPOSED TASK DIRECTORY
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {generatedPlan.plan?.tasks?.map((t: any, idx: number) => (
                    <div
                      key={t.tempId || idx}
                      style={{
                        padding: "12px",
                        background: "rgba(0,0,0,0.25)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="card-badge" style={{ fontSize: "0.7rem" }}>
                            {t.type || "FEATURE"}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t.title}</span>
                        </div>
                        <span className={`risk-tag risk-${(t.riskLevel || "LOW").toLowerCase()}`}>
                          {t.riskLevel || "LOW"} Risk
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                        {t.description}
                      </p>

                      {t.acceptanceCriteria && t.acceptanceCriteria.length > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          <strong>Criteria:</strong> {t.acceptanceCriteria.join(" • ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setGeneratedPlan(null);
                    setPlanApproved(false);
                  }}
                >
                  Create Another Plan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
