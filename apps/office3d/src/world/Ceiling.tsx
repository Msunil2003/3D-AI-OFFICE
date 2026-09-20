import React from "react";

export const Ceiling: React.FC<{ activeFloor?: number }> = () => {
  return (
    <group name="campus-ceilings">
      {/* LEVEL -1 CEILING (Infrastructure: Dark Industrial Grid & Exposed Trusses) */}
      <group position={[0, -0.2, 0]}>
        {/* Perimeter Industrial Ceiling Frame */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[44, 0.15, 38]} />
          <meshStandardMaterial color="#0a0f18" roughness={0.8} metalness={0.5} />
        </mesh>
        {/* Exposed Pipe & Cable Tray Emulation */}
        {[-14, -7, 0, 7, 14].map((z, i) => (
          <mesh key={`pipe-${i}`} position={[0, -0.15, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 42, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* LEVEL 0 CEILING / LEVEL +1 FLOOR UNDERSIDE */}
      {/* With Central Atrium Void opening from [-5 to 5, -5 to 5] so light spills through */}
      <group position={[0, 4.15, 0]}>
        {/* West Wing Ceiling (Engineering) */}
        <mesh position={[-14, 0, 0]} receiveShadow>
          <boxGeometry args={[16, 0.2, 38]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* East Wing Ceiling (QA, DevOps, Meetings) */}
        <mesh position={[14, 0, 0]} receiveShadow>
          <boxGeometry args={[16, 0.2, 38]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* North Mezzanine Connector */}
        <mesh position={[0, 0, -13]} receiveShadow>
          <boxGeometry args={[12, 0.2, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
        </mesh>
        {/* South Mezzanine Connector */}
        <mesh position={[0, 0, 13]} receiveShadow>
          <boxGeometry args={[12, 0.2, 12]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* Recessed Warm Ceiling Downlights along Hallways */}
        {[-3.5, 3.5].map((x, i) => (
          <mesh key={`lightstrip-${i}`} position={[x, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.15, 26]} />
            <meshBasicMaterial color="#f8fafc" />
          </mesh>
        ))}
      </group>

      {/* LEVEL +1 HIGH ROOF & ATRIUM SKYLIGHT (Y = 8.5) */}
      <group position={[0, 8.4, 0]}>
        {/* Perimeter Roof Slabs */}
        <mesh position={[-14, 0, 0]}>
          <boxGeometry args={[16, 0.2, 38]} />
          <meshStandardMaterial color="#090d16" roughness={0.8} />
        </mesh>
        <mesh position={[14, 0, 0]}>
          <boxGeometry args={[16, 0.2, 38]} />
          <meshStandardMaterial color="#090d16" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, -13]}>
          <boxGeometry args={[12, 0.2, 12]} />
          <meshStandardMaterial color="#090d16" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 13]}>
          <boxGeometry args={[12, 0.2, 12]} />
          <meshStandardMaterial color="#090d16" roughness={0.8} />
        </mesh>

        {/* Grand Central Atrium Glass Skylight Roof Frame */}
        <group position={[0, 0.1, 0]}>
          <mesh>
            <boxGeometry args={[12.2, 0.1, 12.2]} />
            <meshPhysicalMaterial
              color="#38bdf8"
              transparent
              opacity={0.3}
              roughness={0.05}
              transmission={0.9}
              thickness={0.8}
            />
          </mesh>
          {/* Metal Grid mullions */}
          {[-4, -2, 0, 2, 4].map((coord, i) => (
            <React.Fragment key={`grid-${i}`}>
              <mesh position={[coord, 0.06, 0]}>
                <boxGeometry args={[0.08, 0.12, 12]} />
                <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.06, coord]}>
                <boxGeometry args={[12, 0.12, 0.08]} />
                <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
              </mesh>
            </React.Fragment>
          ))}
        </group>
      </group>
    </group>
  );
};
