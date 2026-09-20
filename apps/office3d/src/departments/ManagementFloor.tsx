import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export const ManagementFloor: React.FC<{
  onOpenPlanning?: () => void;
  activeGoal?: string;
  taskCount?: number;
}> = ({ onOpenPlanning, activeGoal = "Build authentication middleware with rate limiting.", taskCount = 2 }) => {
  const holoRingRef = useRef<THREE.Group>(null);
  const dagGroupRef = useRef<THREE.Group>(null);

  // Subtle floating rotation for the holographic strategy projection
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (holoRingRef.current) {
      holoRingRef.current.rotation.y = t * 0.18;
    }
    if (dagGroupRef.current) {
      dagGroupRef.current.position.y = 1.35 + Math.sin(t * 1.5) * 0.025;
    }
  });

  return (
    <group position={[0, 0, -10]} onClick={(e) => { e.stopPropagation(); onOpenPlanning?.(); }}>
      {/* --- 1. RAISED ARCHITECTURAL EXECUTIVE PODIUM (VERTICALITY) --- */}
      {/* Base Elevated Platform (Height 0.35) */}
      <mesh position={[0, 0.175, 0]} receiveShadow castShadow>
        <boxGeometry args={[15.6, 0.35, 9.6]} />
        <meshStandardMaterial color="#131726" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Upper Polished Stone Flooring */}
      <mesh position={[0, 0.355, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[15.4, 9.4]} />
        <meshStandardMaterial color="#1a1c2e" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Recessed Purple Neon Step Trim */}
      <mesh position={[0, 0.02, 4.82]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15.6, 0.04]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
      {/* Central Access Steps (Front) */}
      <group position={[0, 0, 4.8]}>
        <mesh position={[0, 0.09, 0.3]} receiveShadow>
          <boxGeometry args={[4.2, 0.18, 0.6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.18, 0.1]} receiveShadow>
          <boxGeometry args={[4.2, 0.02, 0.04]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Safety Glass Balustrades with Brushed Metal Handrails */}
      {/* Left Glass Railing */}
      <group position={[-7.7, 0.35, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.06, 0.8, 9.2]} />
          <meshPhysicalMaterial color="#a855f7" transparent opacity={0.2} roughness={0.1} transmission={0.8} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.08, 0.05, 9.4]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
      {/* Right Glass Railing */}
      <group position={[7.7, 0.35, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.06, 0.8, 9.2]} />
          <meshPhysicalMaterial color="#a855f7" transparent opacity={0.2} roughness={0.1} transmission={0.8} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <boxGeometry args={[0.08, 0.05, 9.4]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* --- 2. EXECUTIVE STRATEGIC PLANNING TABLE --- */}
      <group position={[0, 0.35, 0]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.4, 2.0, 0.1, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Glowing Purple Inlay Ring */}
        <mesh position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.1, 2.15, 32]} />
          <meshBasicMaterial color="#a855f7" />
        </mesh>
        {/* Central Core Glass Sensor Disk */}
        <mesh position={[0, 0.815, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 1.1, 32]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.2} metalness={0.6} />
        </mesh>
        {/* Table Base Pedestal */}
        <mesh position={[0, 0.375, 0]} castShadow>
          <cylinderGeometry args={[0.8, 1.0, 0.75, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>

        {/* --- 3. CLEAN 3D ARCHITECTURAL DAG (AI MANAGER COMMAND CENTER) --- */}
        <group ref={dagGroupRef} position={[0, 1.35, 0]}>
          {/* Subtle Ambient Rotation Rings */}
          <group ref={holoRingRef}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.3, 1.32, 32]} />
              <meshBasicMaterial color="#c084fc" transparent opacity={0.6} />
            </mesh>
          </group>

          {/* Root Goal Node: AI Orchestrator */}
          <group position={[0, 0.55, -0.6]}>
            <mesh castShadow>
              <octahedronGeometry args={[0.18, 0]} />
              <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.8} wireframe />
            </mesh>
            <Text position={[0, 0.28, 0]} fontSize={0.075} color="#ffffff" anchorX="center" fontWeight="bold">
              AI MANAGER: ORCHESTRATION ROOT
            </Text>
            <Text position={[0, 0.16, 0]} fontSize={0.055} color="#c084fc" anchorX="center" maxWidth={2.4}>
              {`"${activeGoal}"`}
            </Text>
          </group>

          {/* Branch Connectors (Emissive Data Bus Lines) */}
          <mesh position={[-0.6, 0.32, -0.3]} rotation={[0, 0, Math.PI / 4]}>
            <cylinderGeometry args={[0.012, 0.012, 1.0]} />
            <meshBasicMaterial color="#818cf8" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0.6, 0.32, -0.3]} rotation={[0, 0, -Math.PI / 4]}>
            <cylinderGeometry args={[0.012, 0.012, 1.0]} />
            <meshBasicMaterial color="#818cf8" transparent opacity={0.7} />
          </mesh>
          <mesh position={[0, 0.25, 0.1]} rotation={[Math.PI / 3, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.8]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
          </mesh>

          {/* Child Node 1: Architecture & OCC Specification */}
          <group position={[-1.1, 0.1, 0]}>
            <mesh>
              <boxGeometry args={[0.7, 0.18, 0.04]} />
              <meshStandardMaterial color="#1e1b4b" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.022]}>
              <planeGeometry args={[0.68, 0.02]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <Text position={[0, 0, 0.025]} fontSize={0.048} color="#f8fafc" anchorX="center">
              1. Spec & OCC [READY]
            </Text>
          </group>

          {/* Child Node 2: Backend API & Worktree */}
          <group position={[0, -0.05, 0.6]}>
            <mesh>
              <boxGeometry args={[0.85, 0.18, 0.04]} />
              <meshStandardMaterial color="#0f2342" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.022]}>
              <planeGeometry args={[0.83, 0.02]} />
              <meshBasicMaterial color="#06b6d4" />
            </mesh>
            <Text position={[0, 0, 0.025]} fontSize={0.048} color="#38bdf8" anchorX="center">
              2. Worktree Dev [IN PROGRESS]
            </Text>
          </group>

          {/* Child Node 3: Automated Testing & Verification */}
          <group position={[1.1, 0.1, 0]}>
            <mesh>
              <boxGeometry args={[0.7, 0.18, 0.04]} />
              <meshStandardMaterial color="#064e3b" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.022]}>
              <planeGeometry args={[0.68, 0.02]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>
            <Text position={[0, 0, 0.025]} fontSize={0.048} color="#a7f3d0" anchorX="center">
              3. QA Verification [TESTING]
            </Text>
          </group>

          {/* Terminal Convergence Node: Governance Merge Gate */}
          <mesh position={[0, -0.22, 0.9]} rotation={[Math.PI / 4, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.5]} />
            <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} />
          </mesh>
          <group position={[0, -0.38, 1.2]}>
            <mesh>
              <boxGeometry args={[0.78, 0.18, 0.04]} />
              <meshStandardMaterial color="#451a03" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0, 0.022]}>
              <planeGeometry args={[0.76, 0.02]} />
              <meshBasicMaterial color="#f59e0b" />
            </mesh>
            <Text position={[0, 0, 0.025]} fontSize={0.048} color="#fef3c7" anchorX="center">
              4. Merge Gate [PENDING]
            </Text>
          </group>
        </group>

        {/* Executive High-back Chairs around Table */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => {
          const x = Math.sin(angle) * 2.8;
          const z = Math.cos(angle) * 2.8;
          return (
            <group key={idx} position={[x, 0, z]} rotation={[0, angle + Math.PI, 0]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.55, 0.08, 0.5]} />
                <meshStandardMaterial color="#1e1b4b" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.85, 0.22]} castShadow>
                <boxGeometry args={[0.5, 0.75, 0.06]} />
                <meshStandardMaterial color="#0f172a" metalness={0.5} />
              </mesh>
              <mesh position={[0, 0.22, 0]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
                <meshStandardMaterial color="#334155" metalness={0.9} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};
