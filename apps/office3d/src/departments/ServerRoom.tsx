import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export const ServerRoom: React.FC<{ onInspect?: () => void }> = ({ onInspect }) => {
  const ledRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ledRef.current) {
      // Subtle rhythmic server rack LED pulse
      const t = clock.getElapsedTime();
      ledRef.current.children.forEach((child: any, idx) => {
        if (child.material) {
          child.material.opacity = 0.4 + Math.sin(t * 4 + idx * 0.7) * 0.5;
        }
      });
    }
  });

  return (
    <group position={[0, -4.0, -6]} name="infrastructure-server-room" onClick={onInspect}>
      {/* Heavy Steel / Carbon Framing & Glass Security Enclosure */}
      <mesh position={[0, 1.8, 8]} receiveShadow>
        <boxGeometry args={[26, 3.6, 0.08]} />
        <meshPhysicalMaterial
          color="#06b6d4"
          transparent
          opacity={0.2}
          roughness={0.1}
          metalness={0.2}
          transmission={0.88}
        />
      </mesh>

      {/* Industrial Entrance Doorway */}
      <group position={[0, 0, 8]}>
        <mesh position={[-1.2, 1.2, 0]}>
          <boxGeometry args={[0.15, 2.4, 0.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        <mesh position={[1.2, 1.2, 0]}>
          <boxGeometry args={[0.15, 2.4, 0.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        <mesh position={[0, 2.45, 0]}>
          <boxGeometry args={[2.55, 0.15, 0.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        <Text position={[0, 2.7, 0.05]} fontSize={0.12} color="#06b6d4" anchorX="center" anchorY="middle" fontWeight="bold">
          LEVEL -1 • INFRASTRUCTURE VAULT & CI/CD CLUSTER
        </Text>
      </group>

      {/* 3 Rows of High-Density Server Racks with Blinking Activity LEDs */}
      {[-8, -3, 2, 7].map((rowX, rIdx) => (
        <group key={`rack-bay-${rIdx}`} position={[rowX, 0, 0]}>
          {[-4, 0, 4].map((rackZ, zIdx) => (
            <group key={`rack-${zIdx}`} position={[0, 0, rackZ]}>
              {/* Rack Chassis (Height 2.4m, Width 1.0m, Depth 0.9m) */}
              <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 2.4, 0.9]} />
                <meshStandardMaterial color="#080c14" roughness={0.3} metalness={0.9} />
              </mesh>
              {/* Perforated Mesh Front Door */}
              <mesh position={[0, 1.2, 0.46]}>
                <planeGeometry args={[0.92, 2.3]} />
                <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.8} />
              </mesh>
              {/* Rack Interior Blade Units (Horizontal chassis slats) */}
              {Array.from({ length: 8 }).map((_, bIdx) => (
                <mesh key={`blade-${bIdx}`} position={[0, 0.3 + bIdx * 0.26, 0.465]}>
                  <planeGeometry args={[0.86, 0.18]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.7} />
                </mesh>
              ))}
              {/* Server Unit Status Indicator Bar */}
              <mesh position={[-0.35, 2.2, 0.47]}>
                <planeGeometry args={[0.1, 0.04]} />
                <meshBasicMaterial color="#10b981" />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Overhead Cable Trays linking all bays */}
      {[-4, 0, 4].map((trayZ, i) => (
        <mesh key={`tray-${i}`} position={[0, 2.8, trayZ]}>
          <boxGeometry args={[20, 0.12, 0.4]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}

      {/* Large Telemetry Wall Display (Back Wall Z = -8) */}
      <group position={[0, 1.8, -7.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[8.4, 2.4, 0.08]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        <Text position={[-3.8, 0.9, 0.05]} fontSize={0.11} color="#06b6d4" anchorX="left" anchorY="top" fontWeight="bold">
          CI/CD RUNTIME TELEMETRY & ARTIFACT REPOSITORY
        </Text>
        <Text position={[-3.8, 0.65, 0.05]} fontSize={0.075} color="#94a3b8" anchorX="left" anchorY="top" maxWidth={7.4}>
          • WORKSPACE ISOLATION: Active Git worktree sessions verified{"\n"}
          • CONTAINER RUNTIMES: OpenCode Docker sandbox • Node PTY socket attached{"\n"}
          • DISASTER RECOVERY: Automated checkpoint snapshotting enabled
        </Text>
      </group>
    </group>
  );
};
