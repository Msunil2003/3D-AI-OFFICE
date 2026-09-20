import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { Workstation3D } from "../components/Workstation3D";

export interface ManagementProps {
  onOpenPlanning?: () => void;
  onInspectWorkstation?: (id: string) => void;
  activeGoal?: string;
  taskCount?: number;
}

export const Management: React.FC<ManagementProps> = ({
  onOpenPlanning,
  onInspectWorkstation,
  activeGoal = "Autonomous multi-agent orchestration and domain milestone planning",
  taskCount = 4
}) => {
  const dagGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (dagGroupRef.current) {
      dagGroupRef.current.position.y = 1.35 + Math.sin(t * 1.5) * 0.03;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.2;
    }
  });

  return (
    <group position={[0, 4.2, -12]} name="ai-manager-command-center" onClick={onOpenPlanning}>
      {/* 1. AI MANAGER WORKSTATION */}
      <Workstation3D
        id="ws-ai-manager"
        name="Nexus • AI Engineering Manager"
        role="Engineering Manager"
        position={[-4.5, 0, 1.5]}
        rotation={[0, 0.4, 0]}
        monitorCount={3}
        taskTitle="System Milestone Decomposition & Worktree Balancing"
        screenContent="architecture"
        onInspect={() => onInspectWorkstation?.("ws-ai-manager")}
      />

      {/* 2. STRATEGIC PLANNING HOLOGRAM ROTUNDA */}
      <group position={[0, 0, 0]}>
        {/* Table Base */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.0, 1.8, 0.1, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.7, 1.76, 32]} />
          <meshBasicMaterial color="#a855f7" />
        </mesh>
        <mesh position={[0, 0.375, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.9, 0.75, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>

        {/* Floating Holographic Strategy Projection */}
        <group ref={dagGroupRef} position={[0, 1.35, 0]}>
          <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.3, 0.02, 16, 48]} />
            <meshBasicMaterial color="#c084fc" />
          </mesh>
          <Text position={[0, 0.4, 0]} fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            AI ENGINEERING COMMAND CENTER
          </Text>
          <Text position={[0, 0.2, 0]} fontSize={0.07} color="#c084fc" anchorX="center" anchorY="middle">
            STRATEGIC GOAL PLANNING & DAG ORCHESTRATION
          </Text>
          <Text position={[0, 0.02, 0]} fontSize={0.055} color="#94a3b8" anchorX="center" anchorY="middle" maxWidth={3.6}>
            {activeGoal}
          </Text>
          <Text position={[0, -0.22, 0]} fontSize={0.06} color="#f59e0b" anchorX="center" anchorY="middle">
            {`[Press E or Click to Open Planning Console • ${taskCount} Active Tasks]`}
          </Text>
        </group>
      </group>
    </group>
  );
};
