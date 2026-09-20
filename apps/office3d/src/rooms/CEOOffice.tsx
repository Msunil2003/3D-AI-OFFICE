import React from "react";
import { Text } from "@react-three/drei";

export interface CEOOfficeProps {
  onOpenConsole?: () => void;
  onOpenStrategyTable?: () => void;
}

export const CEOOffice: React.FC<CEOOfficeProps> = ({
  onOpenConsole,
  onOpenStrategyTable
}) => {
  return (
    <group position={[-12.5, 4.2, -6]} name="ceo-private-office">
      {/* 1. ARCHITECTURAL OFFICE WALLS WITH VIEW WINDOW */}
      {/* North Outer Wall */}
      <mesh position={[0, 1.8, -8]} receiveShadow>
        <boxGeometry args={[14, 3.6, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* West Glass Floor-to-Ceiling View Window (Looking out onto skyline) */}
      <mesh position={[-6.9, 1.8, 0]}>
        <boxGeometry args={[0.08, 3.6, 15.6]} />
        <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.16} roughness={0.05} transmission={0.92} />
      </mesh>
      {/* East Interior Partition with Double Glass Doorway to Mezzanine */}
      <group position={[6.9, 1.8, 0]}>
        <mesh position={[0, 0, -4.5]}>
          <boxGeometry args={[0.08, 3.6, 6.8]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.88} />
        </mesh>
        <mesh position={[0, 0, 4.5]}>
          <boxGeometry args={[0.08, 3.6, 6.8]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.88} />
        </mesh>
        {/* Door Header Plaque */}
        <mesh position={[-0.05, 0.6, 0]}>
          <boxGeometry args={[0.04, 0.4, 2.2]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Text position={[-0.08, 0.6, 0]} fontSize={0.1} color="#f59e0b" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]} fontWeight="bold">
          FOUNDER & CEO OFFICE
        </Text>
      </group>

      {/* 2. EXECUTIVE COMMAND DESK (Dark Walnut & Brushed Brass) */}
      <group position={[0, 0, -4.2]}>
        {/* Desk Top */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.08, 1.2]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Brass Inlay Trim */}
        <mesh position={[0, 0.792, 0]}>
          <boxGeometry args={[2.76, 0.01, 1.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.796, 0.54]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 0.02]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        {/* Desk Pedestals */}
        <mesh position={[-1.1, 0.37, 0]} castShadow>
          <boxGeometry args={[0.45, 0.74, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        <mesh position={[1.1, 0.37, 0]} castShadow>
          <boxGeometry args={[0.45, 0.74, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>

        {/* CEO Executive Leather High-Back Swivel Chair */}
        <group position={[0, 0, -0.9]}>
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.38, 0.08, 10]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.12, 0.58]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.95, -0.28]} rotation={[0.1, 0, 0]} castShadow>
            <boxGeometry args={[0.58, 0.85, 0.1]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.5} />
          </mesh>
        </group>

        {/* Large Transparent CEO Glass Display Panel */}
        <group position={[0, 1.35, 0.2]} onClick={onOpenConsole}>
          <mesh castShadow>
            <boxGeometry args={[1.6, 0.9, 0.03]} />
            <meshPhysicalMaterial
              color="#38bdf8"
              transparent
              opacity={0.3}
              roughness={0.08}
              transmission={0.85}
              emissive="#0284c7"
              emissiveIntensity={0.2}
            />
          </mesh>
          <Text position={[0, 0.32, 0.02]} fontSize={0.07} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">
            EXECUTIVE COMMAND CONSOLE
          </Text>
          <Text position={[0, 0.15, 0.02]} fontSize={0.045} color="#38bdf8" anchorX="center" anchorY="middle">
            • AIOffice Full Virtual Campus Online
          </Text>
          <Text position={[0, 0.02, 0.02]} fontSize={0.045} color="#94a3b8" anchorX="center" anchorY="middle">
            • Executive Governance: All Gates Supervised
          </Text>
          <Text position={[0, -0.15, 0.02]} fontSize={0.045} color="#f59e0b" anchorX="center" anchorY="middle">
            [Click or E to Access Executive Telemetry]
          </Text>
        </group>
      </group>

      {/* 3. CENTRAL STRATEGY TABLE (INTERACTIVE 3D ORG & PROJECT MAP) */}
      <group position={[0, 0, 1.5]} onClick={onOpenStrategyTable}>
        {/* Round Polished Obsidian Strategy Table */}
        <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.3, 0.1, 32]} />
          <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.805, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.3, 1.38, 32]} />
          <meshBasicMaterial color="#a855f7" />
        </mesh>
        <mesh position={[0, 0.375, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.7, 0.75, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>

        {/* Floating Hologram Mini Org Chart above Strategy Table */}
        <group position={[0, 1.3, 0]}>
          <Text position={[0, 0.35, 0]} fontSize={0.09} color="#c084fc" anchorX="center" anchorY="middle" fontWeight="bold">
            STRATEGY & ORGANIZATION GRAPH
          </Text>
          <Text position={[0, 0.18, 0]} fontSize={0.055} color="#38bdf8" anchorX="center" anchorY="middle">
            CEO • AI MANAGER • DEV • QA • DEVOPS • SECURITY
          </Text>
          <Text position={[0, 0.02, 0]} fontSize={0.045} color="#94a3b8" anchorX="center" anchorY="middle">
            [Click to Focus Departments & Inspect Blockers]
          </Text>
        </group>
      </group>

      {/* 4. EXECUTIVE BOOKSHELF & DECOR */}
      <group position={[4.5, 1.4, -4.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.4, 2.6, 2.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        {/* Books & technical artifacts on shelves */}
        {[-0.6, 0, 0.6].map((sy, i) => (
          <mesh key={`shelf-book-${i}`} position={[-0.05, sy, 0]}>
            <boxGeometry args={[0.26, 0.28, 1.8]} />
            <meshStandardMaterial color="#334155" roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* 5. PRIVATE EXECUTIVE LOUNGE SEATING */}
      <group position={[-3.8, 0, 3.8]} rotation={[0, 0.6, 0]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[1.2, 0.44, 0.9]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.6, -0.38]} castShadow>
          <boxGeometry args={[1.2, 0.5, 0.16]} />
          <meshStandardMaterial color="#1e1b4b" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
};
