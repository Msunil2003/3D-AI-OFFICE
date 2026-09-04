import React from "react";

interface Desk3DProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  statusColor?: string;
  isSelected?: boolean;
}

export const Desk3D: React.FC<Desk3DProps> = ({
  position,
  rotation = [0, 0, 0],
  statusColor = "#3b82f6",
  isSelected = false
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Desk Surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.08, 1.2]} />
        <meshStandardMaterial
          color={isSelected ? "#1e293b" : "#1e2433"}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Desk Leg Left */}
      <mesh position={[-0.95, 0.375, 0]} castShadow>
        <boxGeometry args={[0.08, 0.75, 1.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Desk Leg Right */}
      <mesh position={[0.95, 0.375, 0]} castShadow>
        <boxGeometry args={[0.08, 0.75, 1.0]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.8} />
      </mesh>

      {/* Ultra-wide Curved Monitor Stand */}
      <mesh position={[0, 0.95, -0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 16]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Monitor Display */}
      <mesh position={[0, 1.15, -0.35]} castShadow>
        <boxGeometry args={[1.4, 0.45, 0.05]} />
        <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Glowing Screen Face */}
      <mesh position={[0, 1.15, -0.32]}>
        <planeGeometry args={[1.35, 0.4]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {/* Point light from screen */}
      <pointLight
        position={[0, 1.15, -0.1]}
        color={statusColor}
        intensity={isSelected ? 1.5 : 0.8}
        distance={2.5}
      />

      {/* Keyboard */}
      <mesh position={[0, 0.8, 0.15]}>
        <boxGeometry args={[0.6, 0.02, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Mousepad and Mouse */}
      <mesh position={[0.45, 0.795, 0.15]}>
        <boxGeometry args={[0.25, 0.005, 0.25]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.45, 0.81, 0.15]}>
        <boxGeometry args={[0.08, 0.025, 0.12]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>

      {/* Ergonomic Office Chair */}
      <group position={[0, 0, 0.65]}>
        {/* Seat */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.6, 0.08, 0.55]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.85, 0.24]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.55, 0.65, 0.06]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Stem & base */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.45]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
};
