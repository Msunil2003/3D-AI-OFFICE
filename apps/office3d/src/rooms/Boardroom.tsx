import React from "react";
import { Text } from "@react-three/drei";

export interface BoardroomProps {
  onStartMeeting?: () => void;
  isActive?: boolean;
}

export const Boardroom: React.FC<BoardroomProps> = ({
  onStartMeeting,
  isActive = false
}) => {
  return (
    <group position={[12.5, 4.2, -6]} name="executive-boardroom" onClick={onStartMeeting}>
      {/* 1. ARCHITECTURAL GLASS WALLS */}
      <mesh position={[0, 1.8, -8]}>
        <boxGeometry args={[14, 3.6, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[6.9, 1.8, 0]}>
        <boxGeometry args={[0.08, 3.6, 15.6]} />
        <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.16} roughness={0.05} transmission={0.92} />
      </mesh>
      <group position={[-6.9, 1.8, 0]}>
        <mesh position={[0, 0, -4.5]}>
          <boxGeometry args={[0.08, 3.6, 6.8]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.88} />
        </mesh>
        <mesh position={[0, 0, 4.5]}>
          <boxGeometry args={[0.08, 3.6, 6.8]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.88} />
        </mesh>
        {/* Door Header */}
        <mesh position={[0.05, 0.6, 0]}>
          <boxGeometry args={[0.04, 0.4, 2.2]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Text position={[0.08, 0.6, 0]} fontSize={0.1} color="#a855f7" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]} fontWeight="bold">
          EXECUTIVE BOARDROOM
        </Text>
      </group>

      {/* 2. GRAND EXECUTIVE BOARD TABLE (Oval Polished Mahogany & Brushed Steel) */}
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4, 0.1, 2.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.815, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.2, 2.2]} />
        <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.26, 32]} />
        <meshBasicMaterial color={isActive ? "#10b981" : "#a855f7"} />
      </mesh>

      {/* 3. EXECUTIVE BOARD CHAIRS (8 Chairs: 4 on each side) */}
      {[-2.2, -0.7, 0.7, 2.2].map((cx, i) => (
        <React.Fragment key={`board-chair-${i}`}>
          <group position={[cx, 0, -1.6]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.52, 0.08, 0.48]} />
              <meshStandardMaterial color="#18181b" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.82, 0.22]} rotation={[-0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.48, 0.65, 0.06]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
          </group>
          <group position={[cx, 0, 1.6]} rotation={[0, 0, 0]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.52, 0.08, 0.48]} />
              <meshStandardMaterial color="#18181b" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.82, 0.22]} rotation={[-0.1, 0, 0]} castShadow>
              <boxGeometry args={[0.48, 0.65, 0.06]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
          </group>
        </React.Fragment>
      ))}

      {/* 4. LARGE STRATEGY & ROADMAP PRESENTATION WALL (North Wall) */}
      <group position={[0, 2.0, -7.8]}>
        <mesh receiveShadow>
          <boxGeometry args={[7.2, 2.4, 0.08]} />
          <meshStandardMaterial color="#090d16" metalness={0.8} />
        </mesh>
        <Text position={[0, 0.65, 0.05]} fontSize={0.14} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
          BOARDROOM STRATEGY & EXECUTIVE ALIGNMENT
        </Text>
        <Text position={[0, 0.25, 0.05]} fontSize={0.08} color="#c084fc" anchorX="center" anchorY="middle">
          Quarterly Product Roadmap • Multi-Agent Autonomous Engineering
        </Text>
        <Text position={[0, -0.25, 0.05]} fontSize={0.065} color="#94a3b8" anchorX="center" anchorY="middle">
          [Press E or Click to Convene Full Team Architecture Review]
        </Text>
      </group>
    </group>
  );
};
