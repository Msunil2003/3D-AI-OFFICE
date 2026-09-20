import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useOfficeStore } from "../state/officeStore";
import { FLOOR_HEIGHTS, ELEVATOR_POSITION } from "../navigation/ElevatorSystem";

interface DepartmentHeaderProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  color?: string;
}

const DepartmentHeader: React.FC<DepartmentHeaderProps> = ({
  position,
  rotation = [0, 0, 0],
  title,
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Structural Portal Top Frame */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[3.6, 0.12, 0.22]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Sleek Architectural Signage Plaque */}
      <mesh position={[0, 2.38, 0.02]} castShadow>
        <boxGeometry args={[2.8, 0.24, 0.05]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Subtle border detail */}
      <mesh position={[0, 2.27, 0.048]}>
        <boxGeometry args={[2.7, 0.008, 0.01]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Left Column */}
      <mesh position={[-1.75, 1.1, 0]} castShadow>
        <boxGeometry args={[0.1, 2.2, 0.16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Right Column */}
      <mesh position={[1.75, 1.1, 0]} castShadow>
        <boxGeometry args={[0.1, 2.2, 0.16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Clean Architectural Signage Typography */}
      <Text
        position={[0, 2.38, 0.055]}
        fontSize={0.11}
        color="#f1f5f9"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        fontWeight="600"
      >
        {title}
      </Text>
    </group>
  );
};

export const Architecture: React.FC = () => {
  const elevatorFloor = useOfficeStore((state) => state.elevatorFloor);
  const isElevatorMoving = useOfficeStore((state) => state.isElevatorMoving);
  const cabRef = useRef<THREE.Group>(null);

  // Smooth visual elevator cab height animation
  useFrame((_, delta) => {
    if (cabRef.current) {
      const targetY = FLOOR_HEIGHTS[elevatorFloor];
      cabRef.current.position.y = THREE.MathUtils.lerp(cabRef.current.position.y, targetY, delta * 4.0);
    }
  });

  return (
    <group name="campus-architecture-structure">
      {/* ========================================================= */}
      {/* 1. STRUCTURAL PILLARS SPANNING ALL FLOORS (-4 to +8.5)   */}
      {/* ========================================================= */}
      {[
        [-20, -16], [20, -16], [-20, 16], [20, 16],
        [-6, -6], [6, -6], [-6, 6], [6, 6],
        [-13, 0], [13, 0]
      ].map(([x, z], i) => (
        <group key={`p-col-${i}`} position={[x, 2.0, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 12.8, 0.8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Vertical Architectural LED Inlay */}
          <mesh position={[0, 0, 0.41]}>
            <planeGeometry args={[0.08, 12.0]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}

      {/* ========================================================= */}
      {/* 2. GRAND STAIRCASE (LEVEL 0 -> LEVEL +1)                  */}
      {/* Location: X = -3.8, Z from 3.5 to -2.5, Y from 0 to 4.2  */}
      {/* ========================================================= */}
      <group position={[-3.8, 0, 0]} name="grand-staircase-structure">
        {/* 18 Architectural Steps */}
        {Array.from({ length: 18 }).map((_, idx) => {
          const t = idx / 17;
          const stepZ = 3.5 - t * 6.0;
          const stepY = t * 4.2;
          return (
            <group key={`step-${idx}`} position={[0, stepY, stepZ]}>
              {/* Step Tread */}
              <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
                <boxGeometry args={[2.2, 0.2, 0.38]} />
                <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
              </mesh>
              {/* Illuminated Step Nosing Strip */}
              <mesh position={[0, 0.205, 0.18]}>
                <boxGeometry args={[2.18, 0.02, 0.04]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
            </group>
          );
        })}

        {/* Metal Support Stringers under stairs */}
        <mesh position={[-1.05, 2.1, 0.5]} rotation={[0.61, 0, 0]}>
          <boxGeometry args={[0.1, 0.3, 7.6]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[1.05, 2.1, 0.5]} rotation={[0.61, 0, 0]}>
          <boxGeometry args={[0.1, 0.3, 7.6]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Glass Railing with Illuminated Brushed Handrail */}
        <group position={[-1.12, 2.55, 0.5]} rotation={[0.61, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 0.8, 7.4]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.9} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 7.6, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
        <group position={[1.12, 2.55, 0.5]} rotation={[0.61, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 0.8, 7.4]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.9} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 7.6, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 3. INFRASTRUCTURE STAIRCASE (LEVEL 0 -> LEVEL -1)         */}
      {/* Location: X = 3.8, Z from 4.0 to -1.0, Y from 0 to -4.0   */}
      {/* ========================================================= */}
      <group position={[3.8, 0, 0]} name="infra-staircase-structure">
        {Array.from({ length: 16 }).map((_, idx) => {
          const t = idx / 15;
          const stepZ = 4.0 - t * 5.0;
          const stepY = -t * 4.0;
          return (
            <group key={`inf-step-${idx}`} position={[0, stepY, stepZ]}>
              <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
                <boxGeometry args={[1.8, 0.22, 0.35]} />
                <meshStandardMaterial color="#082f49" roughness={0.5} metalness={0.6} />
              </mesh>
              <mesh position={[0, 0.215, 0.16]}>
                <boxGeometry args={[1.76, 0.02, 0.04]} />
                <meshBasicMaterial color="#06b6d4" />
              </mesh>
            </group>
          );
        })}
        {/* Support Rails */}
        <mesh position={[-0.92, -2.0, 1.5]} rotation={[-0.67, 0, 0]}>
          <boxGeometry args={[0.06, 0.7, 6.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
        <mesh position={[0.92, -2.0, 1.5]} rotation={[-0.67, 0, 0]}>
          <boxGeometry args={[0.06, 0.7, 6.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
      </group>

      {/* ========================================================= */}
      {/* 4. GLASS ELEVATOR TOWER & ANIMATED CAB                    */}
      {/* Location: X = 4.2, Z = -2.5, spanning Y = -4.0 to Y = 7.6 */}
      {/* ========================================================= */}
      <group position={ELEVATOR_POSITION} name="elevator-shaft-tower">
        {/* Transparent Glass Shaft Enclosure */}
        <mesh position={[0, 2.0, 0]} receiveShadow>
          <boxGeometry args={[2.4, 12.8, 2.4]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.16}
            roughness={0.05}
            metalness={0.1}
            transmission={0.92}
            ior={1.5}
          />
        </mesh>
        {/* 4 Corner Steel Mullions */}
        {[
          [-1.18, -1.18], [1.18, -1.18], [-1.18, 1.18], [1.18, 1.18]
        ].map(([cx, cz], i) => (
          <mesh key={`el-col-${i}`} position={[cx, 2.0, cz]}>
            <boxGeometry args={[0.1, 12.8, 0.1]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}

        {/* Elevator Doors on Each Floor (-1, 0, +1) */}
        {[-4.0, 0.0, 4.2].map((floorY, i) => (
          <group key={`el-door-${i}`} position={[0, floorY, 1.21]}>
            {/* Left Door Panel */}
            <mesh position={[-0.55, 1.1, 0]}>
              <boxGeometry args={[0.95, 2.2, 0.04]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
            </mesh>
            {/* Right Door Panel */}
            <mesh position={[0.55, 1.1, 0]}>
              <boxGeometry args={[0.95, 2.2, 0.04]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
            </mesh>
            {/* Floor Indicator Digital Display above doors */}
            <mesh position={[0, 2.32, 0.03]}>
              <boxGeometry args={[0.7, 0.22, 0.03]} />
              <meshStandardMaterial color="#0b1120" />
            </mesh>
            <Text
              position={[0, 2.32, 0.05]}
              fontSize={0.11}
              color="#38bdf8"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {i === 0 ? "LEVEL -1" : i === 1 ? "LEVEL 0" : "LEVEL +1"}
            </Text>
          </group>
        ))}

        {/* Animated Glass Elevator Cab */}
        <group ref={cabRef} position={[0, 0, 0]}>
          {/* Cab Floor */}
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[2.0, 0.16, 2.0]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Cab Ceiling & Recessed Downlight */}
          <mesh position={[0, 2.3, 0]}>
            <boxGeometry args={[2.0, 0.14, 2.0]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, 2.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.35, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Cab Glass Walls */}
          <mesh position={[0, 1.15, 0]}>
            <boxGeometry args={[1.96, 2.2, 1.96]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.25} roughness={0.1} transmission={0.9} />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* 5. DEPARTMENT ENTRANCE PORTALS                            */}
      {/* ========================================================= */}
      {/* Engineering Floor Portal (West) */}
      <DepartmentHeader
        position={[-5.0, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        title="ENGINEERING"
      />

      {/* QA Testing Lab Portal (East) */}
      <DepartmentHeader
        position={[5.0, 0, 5]}
        rotation={[0, -Math.PI / 2, 0]}
        title="QA AUTOMATION"
      />

      {/* DevOps Control Room Portal (North-East) */}
      <DepartmentHeader
        position={[5.0, 0, -9]}
        rotation={[0, -Math.PI / 2, 0]}
        title="DEVOPS & CLOUD"
      />

      {/* Security Operations Portal (South-West) */}
      <DepartmentHeader
        position={[-5.0, 0, 13]}
        rotation={[0, Math.PI / 2, 0]}
        title="SECURITY OPERATIONS"
      />

      {/* Meeting Rooms Wing Portal (South-East) */}
      <DepartmentHeader
        position={[5.0, 0, 13]}
        rotation={[0, -Math.PI / 2, 0]}
        title="CONFERENCE SUITE"
      />

      {/* Incident War Room Portal (North) */}
      <DepartmentHeader
        position={[0, 0, -8]}
        rotation={[0, 0, 0]}
        title="INCIDENT WAR ROOM"
      />

      {/* Executive Mezzanine Portal (Level +1) */}
      <DepartmentHeader
        position={[0, 4.2, -7]}
        rotation={[0, 0, 0]}
        title="EXECUTIVE SUITE"
      />
    </group>
  );
};
