import React from "react";
import { Text } from "@react-three/drei";

export interface WorkstationProps {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  engineerName?: string;
  activeStatus?: string;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const DeveloperWorkstation: React.FC<WorkstationProps> = ({
  id,
  position,
  rotation = [0, 0, 0],
  engineerName,
  activeStatus = "idle",
  onSelect,
  isSelected = false
}) => {
  // Screen emissive glow color based on status
  const screenColor =
    activeStatus === "working"
      ? "#38bdf8"
      : activeStatus === "blocked"
      ? "#ef4444"
      : activeStatus === "thinking"
      ? "#f59e0b"
      : "#10b981";

  return (
    <group position={position} rotation={rotation} onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
      {/* Desk Surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.06, 1.1]} />
        <meshStandardMaterial
          color={isSelected ? "#1e293b" : "#0f172a"}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Desk Edge Accent Glow */}
      <mesh position={[0, 0.75, 0.54]}>
        <boxGeometry args={[1.96, 0.02, 0.02]} />
        <meshBasicMaterial color={isSelected ? "#818cf8" : screenColor} />
      </mesh>

      {/* Desk Legs (Brushed Steel Frame) */}
      <mesh position={[-0.92, 0.375, -0.45]} castShadow>
        <boxGeometry args={[0.06, 0.75, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.92, 0.375, -0.45]} castShadow>
        <boxGeometry args={[0.06, 0.75, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.92, 0.375, 0.45]} castShadow>
        <boxGeometry args={[0.06, 0.75, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.92, 0.375, 0.45]} castShadow>
        <boxGeometry args={[0.06, 0.75, 0.06]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* --- DUAL MONITORS --- */}
      {/* Primary Landscape Monitor */}
      <group position={[-0.35, 1.15, -0.2]}>
        {/* Stand */}
        <mesh position={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh position={[0, -0.37, 0]}>
          <boxGeometry args={[0.25, 0.02, 0.18]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[0.78, 0.46, 0.03]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Glowing Display Screen */}
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[0.74, 0.42]} />
          <meshBasicMaterial color={screenColor} />
        </mesh>
        {/* Simulated Code Lines */}
        <mesh position={[-0.05, 0.05, 0.02]}>
          <planeGeometry args={[0.55, 0.22]} />
          <meshBasicMaterial color="#0b1329" />
        </mesh>
      </group>

      {/* Secondary Portrait Monitor (Code / Logs) */}
      <group position={[0.42, 1.25, -0.15]} rotation={[0, -Math.PI / 8, 0]}>
        {/* Stand */}
        <mesh position={[0, -0.25, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[0.44, 0.72, 0.03]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0, 0.018]}>
          <planeGeometry args={[0.4, 0.68]} />
          <meshBasicMaterial color={screenColor} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Mechanical Keyboard */}
      <mesh position={[-0.1, 0.79, 0.18]} castShadow>
        <boxGeometry args={[0.44, 0.02, 0.16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Precision Mouse & Mat */}
      <mesh position={[0.35, 0.785, 0.18]}>
        <boxGeometry args={[0.3, 0.005, 0.25]} />
        <meshStandardMaterial color="#111827" roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 0.8, 0.18]} castShadow>
        <boxGeometry args={[0.08, 0.025, 0.12]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.4} />
      </mesh>

      {/* Workstation Tower PC (Under desk) */}
      <group position={[0.7, 0.35, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.48, 0.45]} />
          <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Front RGB light strip */}
        <mesh position={[0, 0, 0.23]}>
          <planeGeometry args={[0.03, 0.4]} />
          <meshBasicMaterial color={screenColor} />
        </mesh>
      </group>

      {/* Ergonomic Mesh Chair */}
      <group position={[0, 0, 0.75]}>
        {/* Base star */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.04, 5]} />
          <meshStandardMaterial color="#334155" metalness={0.9} />
        </mesh>
        {/* Stem */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>
        {/* Seat cushion */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.55, 0.08, 0.5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.85, 0.23]} rotation={[0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.65, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Headrest */}
        <mesh position={[0, 1.25, 0.26]} castShadow>
          <boxGeometry args={[0.3, 0.14, 0.08]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* Desk Nameplate */}
      {engineerName && (
        <group position={[0, 0.79, 0.48]} rotation={[-Math.PI / 6, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 0.1, 0.02]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
          <Text
            position={[0, 0, 0.015]}
            fontSize={0.045}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {engineerName}
          </Text>
        </group>
      )}
    </group>
  );
};

export const EngineeringFloor: React.FC<{
  onSelectDesk?: (deskId: string) => void;
  selectedDeskId?: string | null;
}> = ({ onSelectDesk, selectedDeskId }) => {
  // 6 Developer Workstation Pods positioned in 2 banks of 3
  const workstations = [
    { id: "desk-eng-1", pos: [-14.5, 0, -5] as [number, number, number], name: "Alex Dev", status: "working" },
    { id: "desk-eng-2", pos: [-11.0, 0, -5] as [number, number, number], name: "Dev Pod 2", status: "idle" },
    { id: "desk-eng-3", pos: [-7.5, 0, -5] as [number, number, number], name: "Dev Pod 3", status: "idle" },
    { id: "desk-eng-4", pos: [-14.5, 0, 2] as [number, number, number], name: "Dev Pod 4", status: "idle" },
    { id: "desk-eng-5", pos: [-11.0, 0, 2] as [number, number, number], name: "Dev Pod 5", status: "idle" },
    { id: "desk-eng-6", pos: [-7.5, 0, 2] as [number, number, number], name: "Dev Pod 6", status: "idle" }
  ];

  return (
    <group name="engineering-department">
      {workstations.map((ws) => (
        <DeveloperWorkstation
          key={ws.id}
          id={ws.id}
          position={ws.pos}
          engineerName={ws.name}
          activeStatus={ws.status}
          isSelected={selectedDeskId === ws.id}
          onSelect={() => onSelectDesk?.(ws.id)}
        />
      ))}
    </group>
  );
};
