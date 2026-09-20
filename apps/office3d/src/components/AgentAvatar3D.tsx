import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { AgentData } from "../hooks/useOfficeSocket";

interface AgentAvatar3DProps {
  agent: AgentData;
  position: [number, number, number];
  isSelected: boolean;
  onSelect: () => void;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  available: "#10b981",
  thinking: "#f59e0b",
  working: "#8b5cf6",
  replied: "#06b6d4",
  error: "#ef4444",
  idle: "#6b7280"
};

export const AgentAvatar3D: React.FC<AgentAvatar3DProps> = ({
  agent,
  position,
  isSelected,
  onSelect
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const statusColor = STATUS_COLOR_MAP[agent.status] || "#3b82f6";

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Subtle idle breathing motion
      groupRef.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.03;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Floating HTML Name Tag & Status Badge */}
      <Html position={[0, 2.05, 0.4]} center distanceFactor={14}>
        <div
          style={{
            background: isSelected
              ? "rgba(30, 58, 138, 0.85)"
              : "rgba(17, 24, 39, 0.8)",
            border: `1px solid ${isSelected ? "#60a5fa" : "rgba(255, 255, 255, 0.15)"}`,
            borderRadius: "6px",
            padding: "4px 8px",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: statusColor,
              boxShadow: `0 0 6px ${statusColor}`
            }}
          />
          {agent.name}
          {agent.provider && (
            <span
              style={{
                fontSize: "10px",
                color: "#9ca3af",
                background: "rgba(255,255,255,0.1)",
                padding: "1px 4px",
                borderRadius: "3px"
              }}
            >
              {agent.provider}
            </span>
          )}
        </div>
      </Html>

      {/* Character Torso */}
      <mesh position={[0, 0.85, 0.45]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.28]} />
        <meshStandardMaterial
          color={isSelected ? "#2563eb" : "#1e293b"}
          roughness={0.5}
        />
      </mesh>

      {/* Character Head */}
      <mesh position={[0, 1.25, 0.45]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.28]} />
        <meshStandardMaterial color="#fde047" roughness={0.6} />
      </mesh>

      {/* Cyber Visor */}
      <mesh position={[0, 1.27, 0.3]}>
        <boxGeometry args={[0.32, 0.08, 0.06]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={1.2}
          roughness={0.1}
        />
      </mesh>

      {/* Selection Glow Aura on the floor */}
      {isSelected && (
        <mesh position={[0, 0.02, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
};
