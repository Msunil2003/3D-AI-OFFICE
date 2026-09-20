import React, { useState } from "react";
import { X, Navigation, MapPin } from "lucide-react";
import { useOfficeStore, FloorLevel } from "../state/officeStore";

export const WorldMap: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const [selectedFloorTab, setSelectedFloorTab] = useState<FloorLevel>(0);
  const ceo = useOfficeStore((state) => state.ceo);
  const teleportCeo = useOfficeStore((state) => state.teleportCeo);
  const setNavigationGuideTarget = useOfficeStore((state) => state.setNavigationGuideTarget);

  if (!isOpen) return null;

  const destinations: { id: string; name: string; dept: string; floor: FloorLevel; pos: [number, number, number] }[] = [
    { id: "reception", name: "Reception", dept: "Welcome & Access", floor: 0, pos: [0, 0, 13] },
    { id: "atrium", name: "Central Atrium", dept: "Public Space", floor: 0, pos: [0, 0, 0] },
    { id: "backend", name: "Backend Pod", dept: "Engineering", floor: 0, pos: [-13.5, 0, -4] },
    { id: "frontend", name: "Frontend Pod", dept: "Engineering", floor: 0, pos: [-13.5, 0, 2] },
    { id: "qa", name: "QA Automation Lab", dept: "Verification", floor: 0, pos: [12.5, 0, 5] },
    { id: "devops", name: "DevOps Control", dept: "Infrastructure", floor: 0, pos: [12.5, 0, -9] },
    { id: "security", name: "Security Operations", dept: "Governance", floor: 0, pos: [-12.5, 0, 12] },
    { id: "meeting", name: "Conference Room A", dept: "Collaboration", floor: 0, pos: [13.5, 0, 13] },
    { id: "war_room", name: "Incident War Room", dept: "Operations", floor: 0, pos: [0, 0, -10] },
    { id: "ceo_office", name: "CEO Office", dept: "Executive", floor: 1, pos: [-12.5, 4.2, -6] },
    { id: "management", name: "Strategy Rotunda", dept: "Management", floor: 1, pos: [0, 4.2, -10] },
    { id: "boardroom", name: "Boardroom", dept: "Executive", floor: 1, pos: [12.5, 4.2, -6] },
    { id: "server_room", name: "Server Vault", dept: "Infrastructure", floor: -1, pos: [0, -4.0, -4] }
  ];

  const filteredDestinations = destinations.filter((d) => d.floor === selectedFloorTab);

  const handleFastTravel = (pos: [number, number, number], floor: FloorLevel) => {
    teleportCeo(pos, floor);
    onClose();
  };

  const handleGuideMe = (pos: [number, number, number]) => {
    setNavigationGuideTarget(pos);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="world-map-modal">
      <div
        className="modal-container campus-map-modal"
        id="campus-map-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">Directory</div>
            <div className="modal-subtitle">Navigate departments, pods, and facilities across building levels</div>
          </div>
          <button className="panel-close-btn" onClick={onClose} title="Close (ESC)" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Floor Level Filter Tabs */}
        <div className="map-floor-tabs">
          <button
            className={`map-floor-tab ${selectedFloorTab === 1 ? "active" : ""}`}
            onClick={() => setSelectedFloorTab(1)}
          >
            Level +1 · Leadership
          </button>
          <button
            className={`map-floor-tab ${selectedFloorTab === 0 ? "active" : ""}`}
            onClick={() => setSelectedFloorTab(0)}
          >
            Level 0 · Operations
          </button>
          <button
            className={`map-floor-tab ${selectedFloorTab === -1 ? "active" : ""}`}
            onClick={() => setSelectedFloorTab(-1)}
          >
            Level -1 · Infrastructure
          </button>
        </div>

        {/* 2D Schematic Floor Grid */}
        <div className="map-schematic-view">
          <div className="schematic-destinations-grid">
            {filteredDestinations.map((d) => (
              <div key={d.id} className="map-destination-card">
                <div className="dest-dept">{d.dept}</div>
                <div className="dest-name">{d.name}</div>
                <div className="dest-actions">
                  <button
                    className="dest-action-btn primary"
                    onClick={() => handleFastTravel(d.pos, d.floor)}
                    title={`Go to ${d.name}`}
                  >
                    <Navigation size={12} />
                    <span>Go To</span>
                  </button>
                  <button
                    className="dest-action-btn"
                    onClick={() => handleGuideMe(d.pos)}
                    title={`Guide path to ${d.name}`}
                  >
                    <MapPin size={12} />
                    <span>Guide Path</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="modal-footer">
          <div className="ceo-coords-readout">
            Current: Level {ceo.floor > 0 ? `+${ceo.floor}` : ceo.floor} · ({ceo.position[0].toFixed(1)}, {ceo.position[2].toFixed(1)})
          </div>
          <button className="footer-action-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
