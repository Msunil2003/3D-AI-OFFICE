import React from "react";
import { Text } from "@react-three/drei";
import { AgentVisualBehavior } from "../state/AgentBehaviorMap";

interface AgentNameplateProps {
  name: string;
  role?: string;
  behavior: AgentVisualBehavior;
  currentTask?: string;
  isSelected?: boolean;
}

export const AgentNameplate: React.FC<AgentNameplateProps> = ({
  name,
  behavior,
  isSelected = false
}) => {
  return (
    <group position={[0, 1.65, 0]}>
      {/* Name — subtle, small, professional */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.065}
        color={isSelected ? "#e2e8f0" : "#cbd5e1"}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {name}
      </Text>

      {/* Status dot — small, semantic color */}
      <mesh position={[0, -0.08, 0]}>
        <circleGeometry args={[0.022, 10]} />
        <meshBasicMaterial color={behavior.color} />
      </mesh>
    </group>
  );
};
