import React from "react";
import { Workstation3D } from "../components/Workstation3D";
import { Text } from "@react-three/drei";

export interface DevOpsControlProps {
  onSelect?: () => void;
  onInspectWorkstation?: (id: string) => void;
}

export const DevOpsControl: React.FC<DevOpsControlProps> = ({
  onSelect,
  onInspectWorkstation
}) => {
  return (
    <group position={[13.5, 0, -9]} name="devops-control-room" onClick={onSelect}>
      {/* SRE / DevOps Operational Workstations */}
      <Workstation3D
        id="ws-devops-1"
        name="Marcus • Lead SRE"
        role="DevOps & Reliability Lead"
        position={[-2.4, 0, 1.2]}
        rotation={[0, 0, 0]}
        monitorCount={3}
        taskTitle="Cluster Ingress Traffic & Canary Release"
        screenContent="metrics"
        onInspect={() => onInspectWorkstation?.("ws-devops-1")}
      />

      <Workstation3D
        id="ws-devops-2"
        name="Aria • Cloud Platform"
        role="Cloud Infrastructure Engineer"
        position={[2.4, 0, 1.2]}
        rotation={[0, 0, 0]}
        monitorCount={2}
        taskTitle="Automated CI/CD Worktree Synchronization"
        screenContent="terminal"
        onInspect={() => onInspectWorkstation?.("ws-devops-2")}
      />

      {/* DevOps Operations Monitoring Big Screen (Back Wall) */}
      <group position={[0, 2.0, -4.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[7.2, 2.4, 0.08]} />
          <meshStandardMaterial color="#0b1324" roughness={0.3} metalness={0.7} />
        </mesh>
        <Text position={[-3.2, 0.9, 0.05]} fontSize={0.12} color="#06b6d4" anchorX="left" anchorY="top" fontWeight="bold">
          CONTINUOUS INTEGRATION & DEPLOYMENT PIPELINE
        </Text>

        {/* Visual Pipeline Stage Blocks */}
        {["SOURCE", "BUILD", "UNIT TESTS", "LINT", "SECURITY AUDIT", "PRODUCTION"].map((stage, idx) => (
          <group key={stage} position={[-2.8 + idx * 1.12, 0.2, 0.05]}>
            <mesh>
              <boxGeometry args={[0.95, 0.55, 0.02]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, -0.25, 0.012]}>
              <planeGeometry args={[0.91, 0.04]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>
            <Text position={[0, 0, 0.015]} fontSize={0.065} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
              {stage}
            </Text>
          </group>
        ))}

        <Text position={[-3.2, -0.4, 0.05]} fontSize={0.075} color="#94a3b8" anchorX="left" anchorY="top">
          PIPELINE STATUS: HEALTHY • RECOVERY DAEMON: RUNNING • AGENTS: CONNECTED
        </Text>
      </group>
    </group>
  );
};
