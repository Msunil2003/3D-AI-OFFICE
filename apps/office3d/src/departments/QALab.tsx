import React from "react";
import { Text } from "@react-three/drei";
import { Workstation3D } from "../components/Workstation3D";

export interface QALabProps {
  onSelect?: () => void;
  onInspectWorkstation?: (id: string) => void;
  testPassCount?: number;
  testFailCount?: number;
}

export const QALab: React.FC<QALabProps> = ({
  onSelect,
  onInspectWorkstation,
  testPassCount = 104,
  testFailCount = 0
}) => {
  return (
    <group position={[13.5, 0, 5]} name="qa-verification-lab" onClick={onSelect}>
      {/* QA Engineer Test Workstation */}
      <Workstation3D
        id="ws-qa-1"
        name="Chloe • QA Verification"
        role="Automated QA Engineer"
        position={[-1.8, 0, 1.2]}
        rotation={[0, 0, 0]}
        monitorCount={2}
        taskTitle="Automated End-to-End Regression Suite"
        screenContent="testing"
        onInspect={() => onInspectWorkstation?.("ws-qa-1")}
      />

      {/* Central Automated Test Verification Rig Wall */}
      <group position={[0, 2.0, -3.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[7.2, 2.4, 0.08]} />
          <meshStandardMaterial color="#022c22" roughness={0.3} metalness={0.7} />
        </mesh>
        <Text position={[-3.2, 0.9, 0.05]} fontSize={0.12} color="#10b981" anchorX="left" anchorY="top" fontWeight="bold">
          AUTOMATED VERIFICATION & TEST RIG TELEMETRY
        </Text>

        {/* Telemetry Metric Cards */}
        <group position={[-2.2, 0.2, 0.05]}>
          <mesh>
            <boxGeometry args={[1.8, 0.7, 0.02]} />
            <meshStandardMaterial color="#064e3b" />
          </mesh>
          <Text position={[0, 0.15, 0.015]} fontSize={0.07} color="#a7f3d0" anchorX="center" anchorY="middle">
            TESTS PASSED
          </Text>
          <Text position={[0, -0.12, 0.015]} fontSize={0.16} color="#34d399" anchorX="center" anchorY="middle" fontWeight="bold">
            {testPassCount}
          </Text>
        </group>

        <group position={[0.2, 0.2, 0.05]}>
          <mesh>
            <boxGeometry args={[1.8, 0.7, 0.02]} />
            <meshStandardMaterial color={testFailCount > 0 ? "#450a0a" : "#064e3b"} />
          </mesh>
          <Text position={[0, 0.15, 0.015]} fontSize={0.07} color={testFailCount > 0 ? "#fca5a5" : "#a7f3d0"} anchorX="center" anchorY="middle">
            FAILURES / BLOCKED
          </Text>
          <Text position={[0, -0.12, 0.015]} fontSize={0.16} color={testFailCount > 0 ? "#ef4444" : "#10b981"} anchorX="center" anchorY="middle" fontWeight="bold">
            {testFailCount}
          </Text>
        </group>

        <group position={[2.4, 0.2, 0.05]}>
          <mesh>
            <boxGeometry args={[1.6, 0.7, 0.02]} />
            <meshStandardMaterial color="#064e3b" />
          </mesh>
          <Text position={[0, 0.15, 0.015]} fontSize={0.07} color="#a7f3d0" anchorX="center" anchorY="middle">
            COVERAGE
          </Text>
          <Text position={[0, -0.12, 0.015]} fontSize={0.14} color="#6ee7b7" anchorX="center" anchorY="middle" fontWeight="bold">
            94.2%
          </Text>
        </group>

        <Text position={[-3.2, -0.42, 0.05]} fontSize={0.075} color="#94a3b8" anchorX="left" anchorY="top">
          EVALUATING: Task unit suites, contract schemas, integration APIs & regression hooks
        </Text>
      </group>
    </group>
  );
};
