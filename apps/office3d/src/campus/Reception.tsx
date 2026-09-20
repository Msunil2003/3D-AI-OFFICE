import React from "react";
import { Text } from "@react-three/drei";

export interface ReceptionProps {
  connected?: boolean;
  engineerCount?: number;
  taskCount?: number;
}

export const Reception: React.FC<ReceptionProps> = ({
  connected = true,
  engineerCount = 2,
  taskCount = 4
}) => {
  return (
    <group position={[0, 0, 13]} name="campus-reception-portal">
      {/* Architectural illumination over reception and branding */}
      <pointLight position={[0, 3.6, 2.0]} color="#e0f2fe" intensity={3.2} distance={12} decay={1.5} />
      
      {/* --- 1. RECEPTION BRANDING WALL (SOUTH WALL) --- */}
      <group position={[0, 1.8, 4.2]}>
        <mesh receiveShadow>
          <boxGeometry args={[14, 3.6, 0.3]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Recessed Backlit Logo Panel */}
        <mesh position={[0, 0.4, 0.16]}>
          <planeGeometry args={[9.5, 1.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
        </mesh>
        {/* Logo Text */}
        <Text
          position={[0, 0.65, 0.18]}
          fontSize={0.32}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.18}
          fontWeight="bold"
        >
          AIOFFICE HEADQUARTERS
        </Text>
        <Text
          position={[0, 0.28, 0.18]}
          fontSize={0.13}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.14}
        >
          AUTONOMOUS AI SOFTWARE ENGINEERING CAMPUS
        </Text>

        {/* Real-time Status Badge on Wall */}
        <mesh position={[0, -0.6, 0.16]}>
          <boxGeometry args={[6.8, 0.45, 0.04]} />
          <meshStandardMaterial color="#131d31" roughness={0.3} metalness={0.5} />
        </mesh>
        <Text
          position={[-2.8, -0.6, 0.19]}
          fontSize={0.09}
          color={connected ? "#10b981" : "#f59e0b"}
          anchorX="left"
          anchorY="middle"
          fontWeight="bold"
        >
          {connected ? "● SYSTEMS OPERATIONAL" : "○ CONNECTING TELEMETRY..."}
        </Text>
        <Text
          position={[0.8, -0.6, 0.19]}
          fontSize={0.08}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          {`ENG: ${engineerCount}  |  ACTIVE TASKS: ${taskCount}`}
        </Text>
      </group>

      {/* --- 2. RECEPTION DESK --- */}
      <group position={[0, 0, 1.2]}>
        {/* Curved / Angled Front Counter */}
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 1.15, 1.0]} />
          <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Stone Countertop Slab */}
        <mesh position={[0, 1.18, 0]} castShadow>
          <boxGeometry args={[4.4, 0.08, 1.1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Glowing Front Accent Strip */}
        <mesh position={[0, 0.7, 0.51]}>
          <planeGeometry args={[3.8, 0.04]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>

        {/* Reception Digital Welcome Terminal */}
        <group position={[0.8, 1.35, -0.1]}>
          <mesh rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.7, 0.45, 0.03]} />
            <meshStandardMaterial color="#0284c7" emissive="#0369a1" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.25, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* --- 3. OPTICAL SECURITY TURNSTILES / ACCESS GATES --- */}
      {[-2.8, 2.8].map((gateX, i) => (
        <group key={`turnstile-${i}`} position={[gateX, 0, -0.8]}>
          {/* Left Barrier Post */}
          <mesh position={[-0.4, 0.5, 0]} castShadow>
            <boxGeometry args={[0.12, 1.0, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Right Barrier Post */}
          <mesh position={[0.4, 0.5, 0]} castShadow>
            <boxGeometry args={[0.12, 1.0, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Glass Optical Swing Barrier */}
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.65, 0.6, 0.03]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} transmission={0.9} />
          </mesh>
          {/* Green Status LED */}
          <mesh position={[0, 0.98, -0.3]}>
            <cylinderGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>
      ))}

      {/* --- 4. VISITOR SEATING LOUNGE --- */}
      <group position={[-5.2, 0, 2.0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 0.4, 0.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, -0.35]} castShadow>
          <boxGeometry args={[2.4, 0.5, 0.15]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};
