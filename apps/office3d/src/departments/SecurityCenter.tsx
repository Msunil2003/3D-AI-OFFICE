import React from "react";
import { Text } from "@react-three/drei";
import { Workstation3D } from "../components/Workstation3D";

export interface SecurityCenterProps {
  onSelect?: () => void;
  onInspectWorkstation?: (id: string) => void;
}

export const SecurityCenter: React.FC<SecurityCenterProps> = ({
  onSelect,
  onInspectWorkstation
}) => {
  return (
    <group position={[-13.5, 0, 13]} name="security-operations-center" onClick={onSelect}>
      {/* Security Operations Engineer Workstation */}
      <Workstation3D
        id="ws-sec-1"
        name="Vance • Security SecOps"
        role="Security & Compliance Engineer"
        position={[1.8, 0, -1.2]}
        rotation={[0, Math.PI, 0]}
        monitorCount={2}
        taskTitle="Audit Trail Ledger & OCC Cryptographic Hashes"
        screenContent="terminal"
        onInspect={() => onInspectWorkstation?.("ws-sec-1")}
      />

      {/* Security Audit Wall & Gate Indicator */}
      <group position={[0, 2.0, 3.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[7.2, 2.4, 0.08]} />
          <meshStandardMaterial color="#2d1305" roughness={0.4} metalness={0.8} />
        </mesh>
        <Text position={[-3.2, 0.9, 0.05]} fontSize={0.12} color="#f59e0b" anchorX="left" anchorY="top" fontWeight="bold">
          SECURITY AUDIT & CRYPTOGRAPHIC INTEGRITY
        </Text>
        <Text position={[-3.2, 0.65, 0.05]} fontSize={0.075} color="#fed7aa" anchorX="left" anchorY="top" maxWidth={6.8}>
          • GOVERNANCE POLICY: Mandatory dual-approver review for schema changes{"\n"}
          • WORKTREE INTEGRITY: Git SHA verification & commit signature validation{"\n"}
          • VULNERABILITY SCAN: Dependency audit status: 0 Critical, 0 High
        </Text>

        {/* Status indicator bar */}
        <mesh position={[0, -0.4, 0.05]}>
          <boxGeometry args={[6.4, 0.35, 0.02]} />
          <meshStandardMaterial color="#451a03" />
        </mesh>
        <Text position={[0, -0.4, 0.07]} fontSize={0.08} color="#f59e0b" anchorX="center" anchorY="middle" fontWeight="bold">
          ACCESS STATUS: RESTRICTED • SECURE AUDIT LEDGER ACTIVE
        </Text>
      </group>
    </group>
  );
};
