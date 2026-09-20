import React from "react";

export const Windows: React.FC = () => {
  return (
    <group name="campus-exterior-windows">
      {/* West Curtain Glass Wall (Spanning Level 0 to Level +1) */}
      <group position={[-22.5, 3.8, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.1, 7.6, 38]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.18}
            roughness={0.08}
            metalness={0.1}
            transmission={0.88}
            ior={1.5}
          />
        </mesh>
        {/* Exterior Vertical Mullions */}
        {[-16, -12, -8, -4, 0, 4, 8, 12, 16].map((z, i) => (
          <mesh key={`wmull-${i}`} position={[0, 0, z]}>
            <boxGeometry args={[0.22, 7.6, 0.12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* East Curtain Glass Wall */}
      <group position={[22.5, 3.8, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[0.1, 7.6, 38]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.18}
            roughness={0.08}
            metalness={0.1}
            transmission={0.88}
            ior={1.5}
          />
        </mesh>
        {/* Exterior Vertical Mullions */}
        {[-16, -12, -8, -4, 0, 4, 8, 12, 16].map((z, i) => (
          <mesh key={`emull-${i}`} position={[0, 0, z]}>
            <boxGeometry args={[0.22, 7.6, 0.12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* North Exterior Glass & Cladding */}
      <group position={[0, 3.8, -19.5]}>
        <mesh receiveShadow>
          <boxGeometry args={[44, 7.6, 0.1]} />
          <meshPhysicalMaterial
            color="#60a5fa"
            transparent
            opacity={0.2}
            roughness={0.08}
            metalness={0.1}
            transmission={0.85}
          />
        </mesh>
        {/* North Horizon Mullions */}
        {[-18, -12, -6, 0, 6, 12, 18].map((x, i) => (
          <mesh key={`nmull-${i}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.14, 7.6, 0.22]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* South Glass Entrance & Balcony Facade */}
      <group position={[0, 3.8, 19.5]}>
        <mesh receiveShadow>
          <boxGeometry args={[44, 7.6, 0.1]} />
          <meshPhysicalMaterial
            color="#60a5fa"
            transparent
            opacity={0.2}
            roughness={0.08}
            metalness={0.1}
            transmission={0.85}
          />
        </mesh>
        {[-18, -12, -6, 6, 12, 18].map((x, i) => (
          <mesh key={`smull-${i}`} position={[x, 0, 0]}>
            <boxGeometry args={[0.14, 7.6, 0.22]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
