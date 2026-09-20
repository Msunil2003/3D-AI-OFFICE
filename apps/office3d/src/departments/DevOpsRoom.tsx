import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export const ServerRack: React.FC<{
  position: [number, number, number];
  name: string;
  load?: string;
}> = ({ position, name, load = "ONLINE" }) => {
  const ledRef = useRef<THREE.MeshBasicMaterial>(null);

  // Subtle pulsing/blinking server activity
  useFrame(({ clock }) => {
    if (ledRef.current) {
      const t = clock.getElapsedTime();
      ledRef.current.opacity = 0.5 + 0.5 * Math.sin(t * 8 + position[0]);
    }
  });

  return (
    <group position={position}>
      {/* 42U Server Rack Cabinet */}
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 2.8, 0.9]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Front Perforated Glass Door */}
      <mesh position={[0, 1.4, 0.46]}>
        <planeGeometry args={[0.82, 2.65]} />
        <meshPhysicalMaterial
          color="#06b6d4"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>
      {/* Internal Blade Units (Tiered Shelves) */}
      {[0.5, 0.9, 1.3, 1.7, 2.1, 2.5].map((y, idx) => (
        <group key={idx} position={[0, y, 0.35]}>
          <mesh>
            <boxGeometry args={[0.8, 0.28, 0.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* LED Activity Lights */}
          <mesh position={[-0.32, 0, 0.105]}>
            <circleGeometry args={[0.015, 8]} />
            <meshBasicMaterial ref={ledRef} color="#38bdf8" transparent />
          </mesh>
          <mesh position={[-0.26, 0, 0.105]}>
            <circleGeometry args={[0.015, 8]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          <mesh position={[-0.20, 0, 0.105]}>
            <circleGeometry args={[0.015, 8]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>
      ))}
      {/* Rack Identification Label */}
      <Text
        position={[0, 2.7, 0.47]}
        fontSize={0.07}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {name}
      </Text>
    </group>
  );
};

export const DevOpsRoom: React.FC<{ onSelect?: () => void }> = ({ onSelect }) => {
  return (
    <group position={[11, 0, -9]} onClick={(e) => { e.stopPropagation(); onSelect?.(); }}>
      {/* Overhead Cable Trays & Conduit */}
      <mesh position={[0, 2.7, -2.0]} receiveShadow>
        <boxGeometry args={[5.2, 0.08, 0.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Cable Drops */}
      {[-2.4, -1.2, 0, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 2.75, -2.0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      ))}

      {/* Server Rack Cluster (4 Towers) */}
      <ServerRack position={[-2.4, 0, -2.0]} name="NODE-01 / PTY" />
      <ServerRack position={[-1.2, 0, -2.0]} name="NODE-02 / GIT" />
      <ServerRack position={[0.0, 0, -2.0]} name="NODE-03 / OPENCODE" />
      <ServerRack position={[1.2, 0, -2.0]} name="NODE-04 / RECOVERY" />

      {/* --- CI/CD PIPELINE VISUALIZATION BOARD (BUILD -> TEST -> SEC -> DEPLOY -> PROD) --- */}
      <group position={[0, 2.0, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[4.2, 0.55, 0.04]} />
          <meshPhysicalMaterial
            color="#083344"
            transparent
            opacity={0.7}
            roughness={0.2}
            metalness={0.8}
            transmission={0.6}
          />
        </mesh>
        <mesh position={[0, 0.23, 0.022]}>
          <planeGeometry args={[4.15, 0.02]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
        <Text position={[0, 0.15, 0.025]} fontSize={0.062} color="#ffffff" anchorX="center" fontWeight="bold">
          CI/CD DEPLOYMENT PIPELINE
        </Text>

        {/* 5 Sequential Stages */}
        {[
          { label: "1. BUILD", status: "PASS", color: "#10b981", x: -1.6 },
          { label: "2. TEST", status: "PASS", color: "#10b981", x: -0.8 },
          { label: "3. SECURITY", status: "GUARD", color: "#f59e0b", x: 0.0 },
          { label: "4. DEPLOY", status: "STAGE", color: "#38bdf8", x: 0.8 },
          { label: "5. PROD", status: "STABLE", color: "#10b981", x: 1.6 }
        ].map((st, i) => (
          <group key={i} position={[st.x, -0.06, 0.025]}>
            <mesh>
              <boxGeometry args={[0.7, 0.18, 0.02]} />
              <meshStandardMaterial color="#0b1329" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, -0.07, 0.012]}>
              <planeGeometry args={[0.66, 0.018]} />
              <meshBasicMaterial color={st.color} />
            </mesh>
            <Text position={[0, 0.02, 0.015]} fontSize={0.046} color="#e2e8f0" anchorX="center">
              {st.label}
            </Text>
            <Text position={[0, -0.04, 0.015]} fontSize={0.038} color={st.color} anchorX="center">
              {st.status}
            </Text>
          </group>
        ))}
      </group>

      {/* DevOps Ops Console & Deployment Terminal */}
      <group position={[0, 0, 1.5]}>
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.0, 0.08, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Curved Deployment Monitor */}
        <mesh position={[0, 1.35, -0.2]} castShadow>
          <boxGeometry args={[2.0, 0.68, 0.04]} />
          <meshStandardMaterial color="#070b13" metalness={0.9} />
        </mesh>
        <mesh position={[0, 1.35, -0.175]}>
          <planeGeometry args={[1.94, 0.62]} />
          <meshBasicMaterial color="#083344" />
        </mesh>
        <Text
          position={[0, 1.5, -0.17]}
          fontSize={0.072}
          color="#22d3ee"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          INFRASTRUCTURE & WORKTREE PIPELINE
        </Text>
        <Text
          position={[0, 1.34, -0.17]}
          fontSize={0.054}
          color="#67e8f9"
          anchorX="center"
          anchorY="middle"
        >
          ISOLATED GIT WORKTREES: ACTIVE
        </Text>
        <Text
          position={[0, 1.2, -0.17]}
          fontSize={0.05}
          color="#a5f3fc"
          anchorX="center"
          anchorY="middle"
        >
          DAEMON CLUSTERS: HEALTHY (3003/3001)
        </Text>
      </group>
    </group>
  );
};
