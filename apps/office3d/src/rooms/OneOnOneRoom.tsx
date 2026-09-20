import React from "react";
import { Text } from "@react-three/drei";

export const OneOnOneRoom: React.FC<{ onInspect?: () => void }> = ({ onInspect }) => {
  return (
    <group position={[5.5, 0, 10.5]} name="one-on-one-room" onClick={onInspect}>
      {/* Soundproof Glass Enclosure */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3.2, 3.0, 3.2]} />
        <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.18} roughness={0.08} transmission={0.9} />
      </mesh>

      {/* Door Header */}
      <Text position={[0, 2.7, 1.62]} fontSize={0.09} color="#38bdf8" anchorX="center" anchorY="middle" fontWeight="bold">
        1:1 DISCUSSION BOOTH
      </Text>

      {/* Center Coffee / Discussion Table */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 20]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.44, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.9} />
      </mesh>

      {/* Two Comfortable Lounge Armchairs Facing Each Other */}
      <group position={[0, 0, -0.8]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.7, 0.35, 0.65]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, -0.28]} castShadow>
          <boxGeometry args={[0.65, 0.45, 0.12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </group>

      <group position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.7, 0.35, 0.65]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.55, -0.28]} castShadow>
          <boxGeometry args={[0.65, 0.45, 0.12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};
