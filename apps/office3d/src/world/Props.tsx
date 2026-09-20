import React from "react";
import { Text } from "@react-three/drei";

export const ArchitecturalPlanter: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Sleek concrete planter pot */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.35, 0.7, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.68, 0]} receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.05, 16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Stylized Modern Plant Foliage */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshStandardMaterial color="#10b981" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0.2, 1.35, 0.1]} castShadow>
        <sphereGeometry args={[0.35, 10, 8]} />
        <meshStandardMaterial color="#059669" roughness={0.6} />
      </mesh>
      <mesh position={[-0.15, 1.4, -0.1]} castShadow>
        <sphereGeometry args={[0.32, 10, 8]} />
        <meshStandardMaterial color="#34d399" roughness={0.6} />
      </mesh>
    </group>
  );
};

export const Whiteboard: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  notes: string[];
}> = ({ position, rotation = [0, 0, 0], title, notes }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Stand Frame */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[2.2, 1.4, 0.06]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Board Surface */}
      <mesh position={[0, 1.2, 0.035]} receiveShadow>
        <planeGeometry args={[2.08, 1.28]} />
        <meshStandardMaterial color="#0a0f1d" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Title */}
      <Text
        position={[-0.95, 1.7, 0.04]}
        fontSize={0.09}
        color="#38bdf8"
        anchorX="left"
        anchorY="top"
        fontWeight="bold"
      >
        {title}
      </Text>
      {/* Bullet Items */}
      {notes.map((note, idx) => (
        <Text
          key={idx}
          position={[-0.92, 1.5 - idx * 0.12, 0.04]}
          fontSize={0.065}
          color="#94a3b8"
          anchorX="left"
          anchorY="top"
          maxWidth={1.85}
        >
          {`• ${note}`}
        </Text>
      ))}
      {/* Support legs */}
      <mesh position={[-0.9, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[0.9, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
    </group>
  );
};

export const LoungeSeating: React.FC<{ position: [number, number, number]; rotation?: [number, number, number] }> = ({
  position,
  rotation = [0, 0, 0]
}) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Modern Modular Sofa Bench */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.35, 0.85]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Sofa Backrest */}
      <mesh position={[0, 0.6, -0.35]} castShadow>
        <boxGeometry args={[2.8, 0.45, 0.16]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Accent Throw Pillows */}
      <mesh position={[-0.9, 0.45, -0.15]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.35, 0.3, 0.1]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.8} />
      </mesh>
      <mesh position={[0.9, 0.45, -0.15]} rotation={[0, -0.2, 0]}>
        <boxGeometry args={[0.35, 0.3, 0.1]} />
        <meshStandardMaterial color="#a855f7" roughness={0.8} />
      </mesh>

      {/* Low Modern Glass Coffee Table */}
      <group position={[0, 0, 1.1]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.05, 0.7]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.4} roughness={0.1} transmission={0.9} />
        </mesh>
        {/* Metal Legs */}
        {[-0.7, 0.7].map((x, xi) =>
          [-0.28, 0.28].map((z, zi) => (
            <mesh key={`${xi}-${zi}`} position={[x, 0.1, z]}>
              <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
              <meshStandardMaterial color="#334155" metalness={0.9} />
            </mesh>
          ))
        )}
        {/* Tech Tablet on Table */}
        <mesh position={[0.2, 0.23, 0]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.25, 0.01, 0.18]} />
          <meshStandardMaterial color="#0284c7" metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
};

export const ArchitecturalDivider: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Outer Slender Frame */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[2.4, 2.2, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.8} />
      </mesh>
      {/* Acoustic Louver Slats */}
      {[-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].map((x, idx) => (
        <mesh key={idx} position={[x, 1.1, 0]}>
          <boxGeometry args={[0.08, 2.0, 0.12]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* Bottom Planter Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[2.5, 0.3, 0.28]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
    </group>
  );
};

export const CoffeeBar: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Bar Counter Base */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.0, 1.0]} />
        <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Countertop with Waterfall Edge */}
      <mesh position={[0, 1.02, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.05, 1.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* Espresso Machine */}
      <mesh position={[-0.9, 1.2, 0]} castShadow>
        <boxGeometry args={[0.7, 0.35, 0.5]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Mugs / Refreshment items */}
      <mesh position={[0.1, 1.08, 0.2]} castShadow>
        <cylinderGeometry args={[0.06, 0.05, 0.12, 10]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[0.3, 1.08, 0.1]} castShadow>
        <cylinderGeometry args={[0.06, 0.05, 0.12, 10]} />
        <meshStandardMaterial color="#a855f7" />
      </mesh>
      {/* Sleek Bar Stools */}
      {[-1.0, 0, 1.0].map((x, i) => (
        <group key={i} position={[x, 0, 0.85]}>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
            <meshStandardMaterial color="#334155" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.325, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.65, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Bar Sign */}
      <Text
        position={[0, 0.5, 0.52]}
        fontSize={0.11}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
        fontWeight="bold"
      >
        LOUNGE & COLLABORATION
      </Text>
    </group>
  );
};

export const Props: React.FC = () => {
  return (
    <group name="campus-props">
      {/* Planters flanking entrance & corridors */}
      <ArchitecturalPlanter position={[-3.2, 0, -5.2]} />
      <ArchitecturalPlanter position={[3.2, 0, -5.2]} />
      <ArchitecturalPlanter position={[-3.2, 0, 5.8]} />
      <ArchitecturalPlanter position={[3.2, 0, 5.8]} />
      <ArchitecturalPlanter position={[-18.5, 0, -15]} />
      <ArchitecturalPlanter position={[18.5, 0, -15]} />

      {/* Modern Architectural Divider Screens */}
      <ArchitecturalDivider position={[-4.5, 0, -2.5]} rotation={[0, Math.PI / 2, 0]} />
      <ArchitecturalDivider position={[4.5, 0, 0.5]} rotation={[0, -Math.PI / 2, 0]} />

      {/* Engineering Whiteboard */}
      <Whiteboard
        position={[-18.5, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        title="SYSTEM ARCHITECTURE"
        notes={[
          "Microservices & Domain Repos",
          "Optimistic Concurrency (OCC)",
          "Isolated Git Worktrees",
          "Zod Review Gate Guardrails"
        ]}
      />

      {/* QA Whiteboard */}
      <Whiteboard
        position={[18.5, 0, 4]}
        rotation={[0, -Math.PI / 2, 0]}
        title="QA TEST CRITERIA"
        notes={[
          "Unit Regression 100% Pass",
          "Path Traversal Prevention",
          "Stale Diff Invalidation Guard",
          "Crash Recovery Auto-Reconcile"
        ]}
      />

      {/* Atrium Lounge Sofa Area */}
      <LoungeSeating position={[0, 0, 11.5]} rotation={[0, Math.PI, 0]} />

      {/* Atrium Coffee Bar & Barstools */}
      <CoffeeBar position={[0, 0, 14.8]} />
    </group>
  );
};
