import React, { useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { useOfficeStore } from "../state/officeStore";

export interface EventItem {
  id: string;
  time: string;
  text: string;
  type?: "info" | "success" | "warning" | "error";
}

interface EventFeedProps {
  events: EventItem[];
}

export const EventFeed: React.FC<EventFeedProps> = ({ events }) => {
  const [collapsed, setCollapsed] = useState(true);
  const focusMode = useOfficeStore((state) => state.focusMode);

  return (
    <div
      className={`event-feed-container ${collapsed ? "collapsed" : ""} ${focusMode ? "focus-hidden" : ""}`}
      data-testid="event-feed"
    >
      <div className="event-feed-header" onClick={() => setCollapsed(!collapsed)}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Activity size={12} color="var(--accent-info)" />
          <span style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.02em" }}>
            Activity Feed
          </span>
        </div>
        <button className="feed-toggle-btn" aria-label="Toggle feed">
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {!collapsed && (
        <div className="event-feed-list">
          {events.length === 0 ? (
            <div className="event-feed-row" style={{ color: "var(--text-tertiary)" }}>
              <span className="event-text">System operational · Awaiting activity</span>
            </div>
          ) : (
            events.slice(0, 6).map((ev) => {
              const dotColor =
                ev.type === "success"
                  ? "var(--accent-success)"
                  : ev.type === "warning"
                  ? "var(--accent-warning)"
                  : ev.type === "error"
                  ? "var(--accent-danger)"
                  : "var(--accent-info)";

              return (
                <div key={ev.id} className="event-feed-row">
                  <span className="event-time">{ev.time}</span>
                  <span className="event-dot" style={{ backgroundColor: dotColor }} />
                  <span className="event-text">{ev.text}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
