import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface MeetingRoomProps {
  id?: string;
  name?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  isActive?: boolean;
  meetingTopic?: string;
  participants?: string[];
  onStartMeeting?: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  id = "meeting-a",
  name = "Conference Room A",
  position = [13.5, 0, 13],
  rotation = [0, 0, 0],
  isActive = false,
  meetingTopic = "Architecture Alignment & Sprint Review",
  participants = [],
  onStartMeeting
}) => {

  return (
    <group position={position} rotation={rotation} name={`meeting-room-${id}`} onClick={onStartMeeting}>
      {/* 1. GLASS ENCLOSURE PARTITIONS */}
      {/* North Wall with Double Glass Doorway */}
      <group position={[0, 1.6, -3.9]}>
        <mesh position={[-2.4, 0, 0]}>
          <boxGeometry args={[3.2, 3.2, 0.08]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.25} roughness={0.1} transmission={0.88} />
        </mesh>
        <mesh position={[2.4, 0, 0]}>
          <boxGeometry args={[3.2, 3.2, 0.08]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.25} roughness={0.1} transmission={0.88} />
        </mesh>
        {/* Door Header */}
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[2.0, 0.4, 0.1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Text position={[0, 1.4, 0.06]} fontSize={0.11} color="#38bdf8" anchorX="center" anchorY="middle" fontWeight="bold">
          {name.toUpperCase()}
        </Text>
      </group>

      {/* East & South Walls */}
      <mesh position={[4.0, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[7.8, 3.2, 0.08]} />
        <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.88} />
      </mesh>
      <mesh position={[0, 1.6, 3.9]}>
        <boxGeometry args={[8.0, 3.2, 0.08]} />
        <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.88} />
      </mesh>

      {/* 2. CONFERENCE TABLE (Polished Slate & Inlay Ring) */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.8, 0.1, 2.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.795, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.6, 2.0]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Table Glowing Perimeter Strip */}
      <mesh position={[0, 0.801, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.65, 32]} />
        <meshBasicMaterial color={isActive ? "#10b981" : "#38bdf8"} />
      </mesh>
      {/* Table Pillars */}
      <mesh position={[-1.8, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.74, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.9} />
      </mesh>
      <mesh position={[1.8, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.74, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.9} />
      </mesh>

      {/* 3. PARTICIPANT SEATS (6 Chairs: 3 on each side) */}
      {[-1.6, 0, 1.6].map((chairX, idx) => (
        <React.Fragment key={`conf-chair-${idx}`}>
          {/* North Row (facing South) */}
          <group position={[chairX, 0, -1.45]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.44, 0]} castShadow>
              <boxGeometry args={[0.48, 0.08, 0.46]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.78, 0.2]} rotation={[-0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.44, 0.58, 0.05]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>

          {/* South Row (facing North) */}
          <group position={[chairX, 0, 1.45]} rotation={[0, 0, 0]}>
            <mesh position={[0, 0.44, 0]} castShadow>
              <boxGeometry args={[0.48, 0.08, 0.46]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.78, 0.2]} rotation={[-0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.44, 0.58, 0.05]} />
              <meshStandardMaterial color="#0f172a" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
          </group>
        </React.Fragment>
      ))}

      {/* 4. PRESENTATION DISPLAY SCREEN ON WEST WALL */}
      <group position={[-3.9, 1.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[3.2, 1.6, 0.06]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[3.1, 1.5]} />
          <meshStandardMaterial
            color={isActive ? "#022c22" : "#0c1729"}
            emissive={isActive ? "#10b981" : "#38bdf8"}
            emissiveIntensity={0.2}
          />
        </mesh>
        <Text position={[0, 0.45, 0.045]} fontSize={0.09} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
          {isActive ? "MEETING ACTIVE • LIVE CONCURRENT SESSION" : "CONFERENCE ROOM • STANDBY"}
        </Text>
        <Text position={[0, 0.2, 0.045]} fontSize={0.065} color={isActive ? "#34d399" : "#38bdf8"} anchorX="center" anchorY="middle">
          {meetingTopic}
        </Text>
        <Text position={[0, -0.2, 0.045]} fontSize={0.055} color="#94a3b8" anchorX="center" anchorY="middle">
          {isActive ? `Participants Present: ${participants.length || "Active Team"}` : "[Press E to Schedule / Start Meeting]"}
        </Text>
      </group>

      {/* 5. ARCHITECTURAL PENDANT LUMINAIRE OVER CONFERENCE TABLE */}
      <group position={[0, 2.4, 0]}>
        {/* Suspension Cables */}
        <mesh position={[-1.2, 0.4, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.8, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh position={[1.2, 0.4, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.8, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        {/* Linear Aluminum Luminaire Housing */}
        <mesh castShadow>
          <boxGeometry args={[3.2, 0.06, 0.18]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Diffuser Surface */}
        <mesh position={[0, -0.031, 0]}>
          <planeGeometry args={[3.1, 0.16]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive={isActive ? "#fef08a" : "#94a3b8"}
            emissiveIntensity={isActive ? 0.6 : 0.2}
          />
        </mesh>
        {/* Downward Architectural Conference Table Light */}
        <pointLight
          position={[0, -0.2, 0]}
          color="#fef08a"
          intensity={isActive ? 0.9 : 0.3}
          distance={4.5}
        />
      </group>

      {/* 6. TABLETOP CONFERENCE SPEAKERPHONE / PRESENCE HUB */}
      <group position={[0, 0.795, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.22, 0.025, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* LED Activity Ring */}
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.18, 24]} />
          <meshBasicMaterial color={isActive ? "#10b981" : "#38bdf8"} />
        </mesh>
      </group>
    </group>
  );
};
