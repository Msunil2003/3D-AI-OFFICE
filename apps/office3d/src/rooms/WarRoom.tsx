import React from "react";
import { Text } from "@react-three/drei";

export interface WarRoomProps {
  isIncidentActive?: boolean;
  incidentTitle?: string;
  onInspect?: () => void;
}

export const WarRoom: React.FC<WarRoomProps> = ({
  isIncidentActive = false,
  incidentTitle = "Diagnostic & Incident Command Standby",
  onInspect
}) => {
  return (
    <group position={[0, 0, -12]} name="incident-war-room" onClick={onInspect}>
      {/* 1. ARCHITECTURAL ENCLOSURE WITH GLASS PORTALS */}
      {/* Back Wall */}
      <mesh position={[0, 1.8, -3.9]} receiveShadow>
        <boxGeometry args={[11.8, 3.6, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Side Partitions */}
      <mesh position={[-5.9, 1.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[7.8, 3.6, 0.1]} />
        <meshPhysicalMaterial
          color={isIncidentActive ? "#ef4444" : "#38bdf8"}
          transparent
          opacity={0.2}
          roughness={0.1}
          transmission={0.88}
        />
      </mesh>
      <mesh position={[5.9, 1.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[7.8, 3.6, 0.1]} />
        <meshPhysicalMaterial
          color={isIncidentActive ? "#ef4444" : "#38bdf8"}
          transparent
          opacity={0.2}
          roughness={0.1}
          transmission={0.88}
        />
      </mesh>

      {/* 2. WAR ROOM SITUATION TABLE */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 0.1, 2.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Glowing Edge Indicator */}
      <mesh position={[0, 0.795, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.2, 1.8]} />
        <meshStandardMaterial color={isIncidentActive ? "#450a0a" : "#1e1b4b"} />
      </mesh>
      <mesh position={[0, 0.801, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.45, 32]} />
        <meshBasicMaterial color={isIncidentActive ? "#ef4444" : "#818cf8"} />
      </mesh>

      {/* 3. INCIDENT COMMAND PARTICIPANT SEATING */}
      {[-1.4, 0, 1.4].map((chairX, idx) => (
        <React.Fragment key={`war-chair-${idx}`}>
          <group position={[chairX, 0, -1.35]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.44, 0]} castShadow>
              <boxGeometry args={[0.46, 0.08, 0.44]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, 0.78, 0.18]} castShadow>
              <boxGeometry args={[0.42, 0.58, 0.05]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
          <group position={[chairX, 0, 1.35]} rotation={[0, 0, 0]}>
            <mesh position={[0, 0.44, 0]} castShadow>
              <boxGeometry args={[0.46, 0.08, 0.44]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, 0.78, 0.18]} castShadow>
              <boxGeometry args={[0.42, 0.58, 0.05]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
          </group>
        </React.Fragment>
      ))}

      {/* 4. LARGE INCIDENT WALL DISPLAY */}
      <group position={[0, 2.0, -3.75]}>
        <mesh receiveShadow>
          <boxGeometry args={[6.8, 2.2, 0.06]} />
          <meshStandardMaterial color="#090d16" metalness={0.8} />
        </mesh>
        <Text
          position={[0, 0.65, 0.04]}
          fontSize={0.13}
          color={isIncidentActive ? "#ef4444" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {isIncidentActive ? "INCIDENT COMMAND ACTIVE • RECOVERY IN PROGRESS" : "INCIDENT WAR ROOM • ALL SYSTEMS HEALTHY"}
        </Text>
        <Text position={[0, 0.22, 0.04]} fontSize={0.075} color={isIncidentActive ? "#fca5a5" : "#38bdf8"} anchorX="center" anchorY="middle">
          {incidentTitle}
        </Text>
        <Text position={[0, -0.25, 0.04]} fontSize={0.06} color="#94a3b8" anchorX="center" anchorY="middle">
          Automated Rollback Engine • Worktree Sanitization • Diagnostic Logs
        </Text>
      </group>

      {/* Red Incident Flashing Alarm Light if active */}
      {isIncidentActive && (
        <pointLight position={[0, 2.8, 0]} color="#ef4444" intensity={2.5} distance={10} />
      )}
    </group>
  );
};
