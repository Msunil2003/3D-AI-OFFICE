import React from "react";
import { Text } from "@react-three/drei";

export const ArchitectureZone: React.FC<{ onInspect?: () => void }> = ({ onInspect }) => {
  return (
    <group position={[-8.5, 0, -6.5]} name="engineering-architecture-zone" onClick={onInspect}>
      {/* High-Top Architectural Drafting / Collaboration Table */}
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.08, 1.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[-1.2, 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.94, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.9} />
      </mesh>
      <mesh position={[1.2, 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.94, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.9} />
      </mesh>

      {/* Modern High Drafting Stools */}
      {[-0.8, 0.8].map((sx, i) => (
        <group key={`stool-${i}`} position={[sx, 0, 0.8]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 16]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.64, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Large Technical Architecture Diagram Whiteboard */}
      <group position={[0, 1.6, -1.2]}>
        <mesh receiveShadow>
          <boxGeometry args={[3.2, 1.6, 0.05]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[3.08, 1.48]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.2} metalness={0.1} />
        </mesh>
        <Text position={[-1.4, 0.62, 0.04]} fontSize={0.09} color="#38bdf8" anchorX="left" anchorY="top" fontWeight="bold">
          SYSTEM ARCHITECTURE & RECONCILIATION DAG
        </Text>
        <Text position={[-1.38, 0.45, 0.04]} fontSize={0.06} color="#94a3b8" anchorX="left" anchorY="top" maxWidth={2.8}>
          • Worktree Manager: Isolated Git branch worktrees per agent{"\n"}
          • Runtime Registry: OpenCode, Claude Code, Copilot engines{"\n"}
          • Event Store & Ledger: Strict OCC optimistic concurrency control{"\n"}
          • Governance Gates: Automated lint & test verification prior to human review
        </Text>
      </group>
    </group>
  );
};
