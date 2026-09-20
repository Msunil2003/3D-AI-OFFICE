import React from "react";
import { X, ArrowUp, ArrowDown, Building, ChevronRight } from "lucide-react";
import { useOfficeStore, FloorLevel } from "../state/officeStore";
import { FLOOR_HEIGHTS, ELEVATOR_POSITION } from "../navigation/ElevatorSystem";

export const ElevatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const ceo = useOfficeStore((state) => state.ceo);
  const teleportCeo = useOfficeStore((state) => state.teleportCeo);
  const setElevatorFloor = useOfficeStore((state) => state.setElevatorFloor);
  const setElevatorMoving = useOfficeStore((state) => state.setElevatorMoving);

  if (!isOpen) return null;

  const handleSelectFloor = (floor: FloorLevel) => {
    if (ceo.floor === floor) {
      onClose();
      return;
    }

    setElevatorMoving(true);
    setElevatorFloor(floor);

    setTimeout(() => {
      teleportCeo([ELEVATOR_POSITION[0], FLOOR_HEIGHTS[floor], ELEVATOR_POSITION[2] + 1.2], floor);
      setElevatorMoving(false);
      onClose();
    }, 600);
  };

  const floors: { level: FloorLevel; name: string; desc: string }[] = [
    {
      level: 1,
      name: "LEVEL +1 · Executive",
      desc: "CEO Office, Strategy Rotunda, Boardroom"
    },
    {
      level: 0,
      name: "LEVEL 0 · Operations",
      desc: "Engineering Pods, QA Lab, DevOps Control, Conference Suite"
    },
    {
      level: -1,
      name: "LEVEL -1 · Infrastructure",
      desc: "Server Vault, Cluster Storage, CI/CD"
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="elevator-modal">
      <div
        className="modal-container elevator-modal"
        id="elevator-modal"
        style={{ maxWidth: "380px", width: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Elevator Transit</div>
            <div className="modal-subtitle">Select destination building level</div>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close (ESC)">
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "var(--space-md)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {floors.map((f) => {
            const isCurrent = ceo.floor === f.level;
            return (
              <button
                key={f.level}
                type="button"
                className="elevator-floor-btn"
                onClick={() => handleSelectFloor(f.level)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-md)",
                  borderRadius: "var(--radius-md)",
                  background: isCurrent ? "rgba(59, 130, 246, 0.08)" : "var(--surface-card)",
                  border: `1px solid ${isCurrent ? "var(--border-focus)" : "var(--border-subtle)"}`,
                  cursor: isCurrent ? "default" : "pointer",
                  transition: "all var(--duration-fast) ease",
                  color: "inherit",
                  fontFamily: "inherit"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {f.name} {isCurrent && <span style={{ fontSize: "0.68rem", color: "var(--accent-primary)", fontWeight: 500 }}>(Current)</span>}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    {f.desc}
                  </div>
                </div>
                {!isCurrent && <ChevronRight size={14} color="var(--text-tertiary)" />}
              </button>
            );
          })}
        </div>

        <div className="modal-footer" style={{ padding: "var(--space-md) var(--space-lg)" }}>
          <button className="footer-action-btn" onClick={onClose} style={{ height: "30px", fontSize: "0.72rem" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
