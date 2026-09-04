import React, { useState } from "react";
import { X, Plus, Sparkles } from "lucide-react";

interface SpawnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawn: (params: {
    name?: string;
    provider: string;
    workingDirectory: string;
    personality?: string;
  }) => Promise<void>;
}

export const SpawnModal: React.FC<SpawnModalProps> = ({ isOpen, onClose, onSpawn }) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("opencode");
  const [workingDirectory, setWorkingDirectory] = useState(
    typeof window !== "undefined" ? window.location.pathname || "." : "."
  );
  const [personality, setPersonality] = useState(
    "Senior software architect focused on clean, modular, and resilient code."
  );
  const [spawning, setSpawning] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workingDirectory.trim()) return;

    setSpawning(true);
    try {
      await onSpawn({
        name: name.trim() || undefined,
        provider,
        workingDirectory: workingDirectory.trim(),
        personality: personality.trim() || undefined
      });
      setName("");
      onClose();
    } catch (err) {
      console.error("Spawn error:", err);
    } finally {
      setSpawning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <h2 className="modal-title">Spawn New AI Software Engineer</h2>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: "6px" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="form-group">
            <label className="form-label">Agent Name (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Runtime Provider</label>
            <select
              className="form-select"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="opencode">OpenCode AI (Headless Server + SDK)</option>
              <option value="mock">Mock Engineer (Offline / Simulated)</option>
              <option value="claude-code">Claude Code (Anthropic CLI)</option>
              <option value="copilot-cli">GitHub Copilot CLI</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Working Directory</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="Path to repository or project workspace"
              value={workingDirectory}
              onChange={(e) => setWorkingDirectory(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Persona & Expertise</label>
            <textarea
              className="form-textarea"
              placeholder="Describe their role, skills, and coding style..."
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose} disabled={spawning}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={spawning}>
              <Plus size={16} />
              {spawning ? "Spawning..." : "Assign Desk & Spawn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
