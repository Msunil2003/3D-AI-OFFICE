import React from "react";

export const Exterior: React.FC = () => {
  return (
    <group name="campus-exterior-environment">
      {/* Ground Landscape Plane (Grass / Campus Plaza Paving) */}
      <mesh position={[0, -0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#060911" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Outer Plaza Ring Walkway around the building */}
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[26, 44, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Landscaped Greenery Buffers (West & East Courtyards) */}
      <mesh position={[-34, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 60]} />
        <meshStandardMaterial color="#064e3b" roughness={0.9} />
      </mesh>
      <mesh position={[34, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 60]} />
        <meshStandardMaterial color="#064e3b" roughness={0.9} />
      </mesh>

      {/* Exterior Courtyard Stylized Trees & Foliage */}
      {[
        [-32, -18], [-35, -10], [-31, 0], [-35, 12], [-32, 22],
        [32, -18], [35, -10], [31, 0], [35, 12], [32, 22]
      ].map(([x, z], i) => (
        <group key={`ext-tree-${i}`} position={[x, 0, z]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.28, 2.8, 8]} />
            <meshStandardMaterial color="#1e293b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 3.4, 0]} castShadow>
            <coneGeometry args={[1.5, 3.0, 8]} />
            <meshStandardMaterial color="#059669" roughness={0.6} />
          </mesh>
          <mesh position={[0, 4.4, 0]} castShadow>
            <coneGeometry args={[1.1, 2.4, 8]} />
            <meshStandardMaterial color="#10b981" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Distant Modern Technology Skyline (North & South Horizons) */}
      {[
        { x: -45, z: -55, w: 16, h: 42, d: 16, color: "#0c1322" },
        { x: -20, z: -62, w: 22, h: 56, d: 20, color: "#111a2e" },
        { x: 10, z: -58, w: 18, h: 48, d: 18, color: "#0d1629" },
        { x: 38, z: -64, w: 24, h: 64, d: 22, color: "#131f38" },
        { x: -50, z: 58, w: 20, h: 36, d: 18, color: "#0b111e" },
        { x: -15, z: 62, w: 16, h: 45, d: 16, color: "#0e172a" },
        { x: 25, z: 60, w: 22, h: 52, d: 20, color: "#101b30" },
        { x: 55, z: 54, w: 18, h: 38, d: 18, color: "#0c1424" }
      ].map((b, i) => (
        <group key={`bldg-${i}`} position={[b.x, b.h / 2, b.z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.color} roughness={0.5} metalness={0.7} />
          </mesh>
          {/* Subtle architectural vertical window light bands */}
          <mesh position={[0, 0, b.d / 2 + 0.1]}>
            <planeGeometry args={[b.w * 0.7, b.h * 0.8]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} />
          </mesh>
          {/* Roof beacon light */}
          <mesh position={[0, b.h / 2 + 0.5, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 1.0]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      ))}

      {/* Atmospheric Horizon Ambient Glow */}
      <mesh position={[0, 0, -70]} rotation={[0, 0, 0]}>
        <planeGeometry args={[180, 50]} />
        <meshBasicMaterial color="#1e1b4b" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};
