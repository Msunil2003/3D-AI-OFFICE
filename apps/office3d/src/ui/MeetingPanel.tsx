import React, { useState } from "react";
import { X, Users, Calendar, Play, CheckSquare, Clock } from "lucide-react";
import { AgentData } from "../hooks/useOfficeSocket";
import { useOfficeStore } from "../state/officeStore";

export interface MeetingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentData[];
  onMeetingScheduled?: (meeting: any) => void;
}

const MEETING_TYPES = [
  "Architecture Review",
  "Sprint Planning",
  "Incident Response",
  "Code Review",
  "Security Review",
  "1:1 Technical Sync",
  "General Team Alignment"
];

export const MeetingPanel: React.FC<MeetingPanelProps> = ({
  isOpen,
  onClose,
  agents,
  onMeetingScheduled
}) => {
  const [selectedType, setSelectedType] = useState(MEETING_TYPES[0]);
  const [title, setTitle] = useState("Sprint Architecture Review");
  const [agenda, setAgenda] = useState("Align on Git worktree reconciliation and event sourcing");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    agents.slice(0, 3).map((a) => a.agentId)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeMeeting = useOfficeStore((state) => state.activeMeeting);
  const setActiveMeeting = useOfficeStore((state) => state.setActiveMeeting);

  if (!isOpen) return null;

  const toggleParticipant = (id: string) => {
    if (selectedParticipants.includes(id)) {
      setSelectedParticipants(selectedParticipants.filter((p) => p !== id));
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
    }
  };

  const handleStartMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Call real backend MeetingService
      const res = await fetch("http://localhost:3003/api/meetings/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "default",
          title,
          purpose: selectedType,
          participants: selectedParticipants,
          agenda: agenda.split("\n").filter(Boolean)
        })
      });

      let meetingData;
      if (res.ok) {
        const json = await res.json();
        meetingData = json.meeting;
        // Start meeting
        await fetch(`http://localhost:3003/api/meetings/${meetingData.id}/start`, {
          method: "POST"
        });
      } else {
        // Fallback local meeting instance if offline
        meetingData = {
          id: `meet-${Date.now()}`,
          title,
          purpose: selectedType,
          participants: selectedParticipants,
          agenda: [agenda],
          status: "IN_PROGRESS"
        };
      }

      setActiveMeeting({
        id: meetingData.id,
        title: meetingData.title,
        type: selectedType,
        participants: selectedParticipants,
        agenda: meetingData.agenda || [agenda],
        status: "IN_PROGRESS",
        room: "meeting-a"
      });

      onMeetingScheduled?.(meetingData);
      onClose();
    } catch {
      setActiveMeeting({
        id: `meet-${Date.now()}`,
        title,
        type: selectedType,
        participants: selectedParticipants,
        agenda: [agenda],
        status: "IN_PROGRESS",
        room: "meeting-a"
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConcludeMeeting = async () => {
    if (!activeMeeting) return;
    try {
      await fetch(`http://localhost:3003/api/meetings/${activeMeeting.id}/conclude`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomes: ["Architecture aligned", "Proceed with PR merges"] })
      });
    } catch {}
    setActiveMeeting(null);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="meeting-modal">
      <div
        className="modal-container meeting-modal"
        id="meeting-scheduler-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Conference Suite · Team Sync</div>
            <div className="modal-subtitle">Convene engineers in Conference Room A for architectural or sprint alignment</div>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close (ESC)">
            <X size={16} />
          </button>
        </div>

        {activeMeeting ? (
          <div className="active-meeting-dashboard">
            <div className="active-badge">● Session In Progress</div>
            <div className="meeting-title-lg">{activeMeeting.title}</div>
            <div className="meeting-meta-row">
              <span><strong>Type:</strong> {activeMeeting.type}</span>
              <span><strong>Location:</strong> Conference Room A</span>
              <span><strong>Participants:</strong> {activeMeeting.participants.length} Active</span>
            </div>
            <div className="agenda-box">
              <div className="box-title">AGENDA & TOPICS</div>
              <ul>
                {activeMeeting.agenda.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="footer-action-btn danger" onClick={handleConcludeMeeting}>
                Conclude Meeting
              </button>
              <button className="footer-action-btn" onClick={onClose}>
                Return to Campus
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleStartMeeting} className="meeting-form">
            <div className="form-group">
              <label>MEETING TYPE</label>
              <select
                className="modal-select"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setTitle(`${e.target.value} · Sync`);
                }}
              >
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>TITLE</label>
              <input
                type="text"
                className="modal-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>AGENDA & PURPOSE</label>
              <textarea
                className="modal-textarea"
                rows={3}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>REQUIRED PARTICIPANTS</label>
              <div className="participant-chips">
                {agents.map((agent) => {
                  const isChecked = selectedParticipants.includes(agent.agentId);
                  return (
                    <button
                      type="button"
                      key={agent.agentId}
                      className={`participant-chip ${isChecked ? "selected" : ""}`}
                      onClick={() => toggleParticipant(agent.agentId)}
                    >
                      <span className="chip-check">{isChecked ? "✓" : "+"}</span>
                      <span>{agent.name}</span>
                      <span className="chip-role">({(agent as any).role || agent.summary || "Engineer"})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="footer-action-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="footer-action-btn primary" disabled={isSubmitting}>
                <Play size={13} />
                <span>{isSubmitting ? "Starting..." : "Convene Meeting"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
