import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface MeetingRoomProps {
  position?: [number, number, number];
  isActive?: boolean;
  meetingTopic?: string;
  onEnterMeeting?: () => void;
}

export const MeetingRoom3D: React.FC<MeetingRoomProps> = ({
  position = [0, 0, 0],
  isActive = false,
  meetingTopic = "Architecture Review",
  onEnterMeeting
}) => {

  return (
    <group position={position} onClick={onEnterMeeting}>
      {/* Floor outline for Meeting Room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial
          color={isActive ? "#0d1b2a" : "#080c14"}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Glass partitions / borders */}
      {/* Back glass wall */}
      <mesh position={[0, 1.5, -4]}>
        <boxGeometry args={[10, 3, 0.1]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          transparent
          opacity={0.25}
          roughness={0.1}
          metalness={0.1}
          transmission={0.8}
        />
      </mesh>
      {/* Left glass wall */}
      <mesh position={[-5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[8, 3, 0.1]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          transparent
          opacity={0.25}
          roughness={0.1}
          metalness={0.1}
          transmission={0.8}
        />
      </mesh>
      {/* Right glass wall */}
      <mesh position={[5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[8, 3, 0.1]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          transparent
          opacity={0.25}
          roughness={0.1}
          metalness={0.1}
          transmission={0.8}
        />
      </mesh>

      {/* Conference Table */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.12, 3]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {/* Table Legs */}
      <mesh position={[-2.4, 0.375, -1]}>
        <cylinderGeometry args={[0.08, 0.08, 0.75]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
      <mesh position={[2.4, 0.375, -1]}>
        <cylinderGeometry args={[0.08, 0.08, 0.75]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
      <mesh position={[-2.4, 0.375, 1]}>
        <cylinderGeometry args={[0.08, 0.08, 0.75]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
      <mesh position={[2.4, 0.375, 1]}>
        <cylinderGeometry args={[0.08, 0.08, 0.75]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>

      {/* Conference Chairs */}
      {[-2, 0, 2].map((x) => (
        <React.Fragment key={`chair-side-a-${x}`}>
          {/* North side */}
          <group position={[x, 0, -1.8]}>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[0.7, 0.08, 0.7]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.85, -0.3]}>
              <boxGeometry args={[0.7, 0.75, 0.08]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.225, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.45]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>
          </group>

          {/* South side */}
          <group position={[x, 0, 1.8]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[0.7, 0.08, 0.7]} />
              <meshStandardMaterial color="#334155" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.85, -0.3]}>
              <boxGeometry args={[0.7, 0.75, 0.08]} />
              <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.225, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.45]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>
          </group>
        </React.Fragment>
      ))}

      {/* Architectural Wall Signage Plaque */}
      <group position={[0, 2.2, -3.95]}>
        <mesh castShadow>
          <boxGeometry args={[3.2, 0.35, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Status LED Pip */}
        <mesh position={[-1.35, 0, 0.025]}>
          <circleGeometry args={[0.04, 16]} />
          <meshBasicMaterial color={isActive ? "#10b981" : "#38bdf8"} />
        </mesh>
        <Text
          position={[-0.2, 0.04, 0.03]}
          fontSize={0.12}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
          fontWeight="bold"
        >
          CONF ROOM A • ARCHITECTURE
        </Text>
        <Text
          position={[-0.2, -0.07, 0.03]}
          fontSize={0.065}
          color={isActive ? "#10b981" : "#94a3b8"}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.1}
        >
          {isActive ? "STATUS: LIVE ARCHITECTURE SYNC" : "STATUS: AVAILABLE FOR SESSION"}
        </Text>
      </group>

      {/* Wall Display Presentation Monitor */}
      <group position={[0, 1.4, -3.95]}>
        <mesh castShadow>
          <boxGeometry args={[2.4, 1.1, 0.04]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[2.28, 0.98]} />
          <meshStandardMaterial color="#07101f" roughness={0.2} metalness={0.3} />
        </mesh>
        <Text
          position={[0, 0.28, 0.03]}
          fontSize={0.068}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          SESSION AGENDA: DOMAIN SERVICES
        </Text>
        <Text
          position={[0, 0.08, 0.03]}
          fontSize={0.05}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.1}
        >
          • Isolation via Git Worktrees (OCC Revisioning)
        </Text>
        <Text
          position={[0, -0.06, 0.03]}
          fontSize={0.05}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.1}
        >
          • Automated Regression Verification & Review Gate
        </Text>
        <Text
          position={[0, -0.2, 0.03]}
          fontSize={0.05}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.1}
        >
          • Human Authorization Cryptographic Diff Hash
        </Text>
      </group>

      {/* 5. ARCHITECTURAL PENDANT LUMINAIRE OVER CONFERENCE TABLE */}
      <group position={[0, 2.4, 0]}>
        <mesh position={[-1.2, 0.4, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.8, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh position={[1.2, 0.4, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.8, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[3.2, 0.06, 0.18]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.031, 0]}>
          <planeGeometry args={[3.1, 0.16]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive={isActive ? "#fef08a" : "#94a3b8"}
            emissiveIntensity={isActive ? 0.6 : 0.2}
          />
        </mesh>
        <pointLight
          position={[0, -0.2, 0]}
          color="#fef08a"
          intensity={isActive ? 0.9 : 0.3}
          distance={4.5}
        />
      </group>

      {/* 6. TABLETOP CONFERENCE PRESENCE HUB */}
      <group position={[0, 0.81, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.025, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.18, 24]} />
          <meshBasicMaterial color={isActive ? "#10b981" : "#38bdf8"} />
        </mesh>
      </group>
    </group>
  );
};
