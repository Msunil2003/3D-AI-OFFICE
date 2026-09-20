import React from "react";
import { Text } from "@react-three/drei";

export interface GovernanceRoomProps {
  pendingGatesCount?: number;
  onOpenGovernance?: () => void;
}

export const GovernanceRoom: React.FC<GovernanceRoomProps> = ({
  pendingGatesCount = 0,
  onOpenGovernance
}) => {
  return (
    <group position={[-13.5, 0, 7.5]} name="governance-center" onClick={onOpenGovernance}>
      {/* 1. ARCHITECTURAL GATEWAY & PARTITIONS */}
      <group position={[0, 1.8, 3.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[7.2, 3.6, 0.1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
        </mesh>
        <Text position={[0, 1.2, 0.06]} fontSize={0.13} color="#f59e0b" anchorX="center" anchorY="middle" fontWeight="bold">
          HUMAN GOVERNANCE & MERGE GATES
        </Text>
        <Text position={[0, 0.95, 0.06]} fontSize={0.07} color="#94a3b8" anchorX="center" anchorY="middle">
          EXECUTIVE OVERSIGHT • PRODUCTION MERGE GATES
        </Text>
      </group>

      {/* 2. GOVERNANCE DECISION CONSOLE PODIUM */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 1.1, 0.9]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Slanted Glass Touchscreen Console */}
        <mesh position={[0, 1.12, 0]} rotation={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[1.6, 0.9, 0.04]} />
          <meshPhysicalMaterial
            color={pendingGatesCount > 0 ? "#f59e0b" : "#38bdf8"}
            transparent
            opacity={0.3}
            roughness={0.08}
            emissive={pendingGatesCount > 0 ? "#d97706" : "#0284c7"}
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* Console Text Display */}
        <Text
          position={[0, 1.25, -0.1]}
          rotation={[-0.35, 0, 0]}
          fontSize={0.08}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {pendingGatesCount > 0 ? `⚠ ${pendingGatesCount} PENDING APPROVAL GATE` : "✓ ZERO GATES PENDING"}
        </Text>
        <Text
          position={[0, 1.1, -0.05]}
          rotation={[-0.35, 0, 0]}
          fontSize={0.055}
          color={pendingGatesCount > 0 ? "#fef08a" : "#38bdf8"}
          anchorX="center"
          anchorY="middle"
        >
          {pendingGatesCount > 0 ? "[Press E or Click to Inspect & Approve]" : "All agent merges audited & verified"}
        </Text>

        {/* Pedestal Pulse Light */}
        <mesh position={[0, 0.02, 0.46]}>
          <planeGeometry args={[1.6, 0.04]} />
          <meshBasicMaterial color={pendingGatesCount > 0 ? "#f59e0b" : "#10b981"} />
        </mesh>
      </group>
    </group>
  );
};
