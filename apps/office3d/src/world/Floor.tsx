import React from "react";

export const Floor: React.FC = () => {
  return (
    <group name="campus-multi-level-flooring">
      {/* ========================================================= */}
      {/* LEVEL -1: INFRASTRUCTURE & SERVER VAULT (Y = -4.0)        */}
      {/* ========================================================= */}
      <group position={[0, -4.0, 0]}>
        {/* Foundation Slab */}
        <mesh position={[0, -0.2, 0]} receiveShadow>
          <boxGeometry args={[44, 0.4, 38]} />
          <meshStandardMaterial color="#05070c" roughness={0.9} metalness={0.4} />
        </mesh>

        {/* Industrial Flooring Surface */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[42, 36]} />
          <meshStandardMaterial color="#0c1017" roughness={0.7} metalness={0.5} />
        </mesh>

        {/* Server Room Raised Perforated Tile Grid */}
        <mesh position={[0, 0.02, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[28, 18]} />
          <meshStandardMaterial color="#082f49" roughness={0.4} metalness={0.6} />
        </mesh>

        {/* Cable Tray Recessed Guide Lines (Cyan/Amber LED) */}
        {[-8, 0, 8].map((x, i) => (
          <mesh key={`lvl-neg1-line-${i}`} position={[x, 0.025, -6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 17.6]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>
        ))}
      </group>

      {/* ========================================================= */}
      {/* LEVEL 0: OPERATIONS FLOOR (Y = 0.0)                       */}
      {/* ========================================================= */}
      <group position={[0, 0, 0]}>
        {/* Primary Foundation Slab */}
        <mesh position={[0, -0.2, 0]} receiveShadow>
          <boxGeometry args={[44, 0.4, 38]} />
          <meshStandardMaterial color="#0b0f17" roughness={0.7} metalness={0.2} />
        </mesh>

        {/* Perimeter Polished Border Trim */}
        <mesh position={[0, -0.01, 0]} receiveShadow>
          <boxGeometry args={[43.6, 0.02, 37.6]} />
          <meshStandardMaterial color="#131b2e" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* --- MAIN CIRCULATION HALLWAYS & WALKWAYS --- */}
        {/* North-South Spine Walkway */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4.8, 36]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* East-West Connector Walkway */}
        <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[38, 4.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
        </mesh>

        {/* Embedded LED Guide Strips */}
        <mesh position={[-2.4, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 34]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
        </mesh>
        <mesh position={[2.4, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 34]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.01, -2.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[36, 0.08]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.01, 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[36, 0.08]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.8} />
        </mesh>

        {/* --- 1. RECEPTION & SOUTH ENTRANCE (POLISHED STONE) --- */}
        <group position={[0, 0.01, 13]}>
          <mesh receiveShadow>
            <boxGeometry args={[16, 0.02, 8]} />
            <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.5} />
          </mesh>
          {/* Welcome Inlay */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14, 6]} />
            <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.025, 3.8]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[15, 0.08]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>

        {/* --- 2. CENTRAL ATRIUM (STONE & COMPOSITE ROTUNDA) --- */}
        <group position={[0, 0.015, 0]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[5.2, 48]} />
            <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[5.15, 5.25, 48]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.9} />
          </mesh>
          {/* Concentric Modern Tech Rosette */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
            <ringGeometry args={[2.8, 3.0, 48]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
          </mesh>
        </group>

        {/* --- 3. ENGINEERING WING (WEST: TECHNICAL CARPET) --- */}
        <group position={[-12.5, 0.01, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[15, 0.02, 22]} />
            <meshStandardMaterial color="#0f172a" roughness={0.65} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14.2, 21]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.25} />
          </mesh>
          {/* Cyan Pod Glow Strip */}
          <mesh position={[7.3, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 21.2]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>

        {/* --- 4. QA TESTING LAB (EAST: CLEAN WHITE/EMERALD COMPOSITE) --- */}
        <group position={[12.5, 0.01, 5]}>
          <mesh receiveShadow>
            <boxGeometry args={[15, 0.02, 12]} />
            <meshStandardMaterial color="#064e3b" roughness={0.35} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14.2, 11.2]} />
            <meshStandardMaterial color="#022c22" roughness={0.3} metalness={0.35} />
          </mesh>
          <mesh position={[-7.3, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.1, 11.6]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>

        {/* --- 5. DEVOPS CONTROL ROOM (NORTH-EAST: INDUSTRIAL RAISED FLOOR) --- */}
        <group position={[12.5, 0.01, -9]}>
          <mesh receiveShadow>
            <boxGeometry args={[15, 0.03, 12]} />
            <meshStandardMaterial color="#083344" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14.2, 11.2]} />
            <meshStandardMaterial color="#0e7490" roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position={[-7.3, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.12, 11.6]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>
        </group>

        {/* --- 6. SECURITY OPERATIONS (SOUTH-WEST: HARDENED COMPOSITE) --- */}
        <group position={[-12.5, 0.01, 13]}>
          <mesh receiveShadow>
            <boxGeometry args={[15, 0.02, 8]} />
            <meshStandardMaterial color="#451a03" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.025, -3.9]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14.6, 0.1]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>

        {/* --- 7. CONFERENCE ROOMS & MEETING SUITE (SOUTH-EAST) --- */}
        <group position={[12.5, 0.01, 13]}>
          <mesh receiveShadow>
            <boxGeometry args={[15, 0.02, 8]} />
            <meshStandardMaterial color="#0c1a2e" roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.025, -3.9]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14.6, 0.1]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>

        {/* --- 8. INCIDENT WAR ROOM (NORTH WALL: X=[-4, 4], Z=[-12, -16]) --- */}
        <group position={[0, 0.01, -12]}>
          <mesh receiveShadow>
            <boxGeometry args={[12, 0.02, 8]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.4} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.025, 3.8]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[11.6, 0.08]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      </group>

      {/* ========================================================= */}
      {/* LEVEL +1: LEADERSHIP MEZZANINE (Y = 4.2)                  */}
      {/* ========================================================= */}
      <group position={[0, 4.2, 0]}>
        {/* Mezzanine Slab with Central Open Well */}
        {/* West Mezzanine Wing (CEO Office Suite) */}
        <group position={[-12.5, -0.1, -6]}>
          <mesh receiveShadow>
            <boxGeometry args={[15, 0.2, 22]} />
            <meshStandardMaterial color="#172554" roughness={0.4} metalness={0.3} />
          </mesh>
          {/* Executive Dark Walnut Hardwood Flooring */}
          <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14.4, 21.4]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.3} metalness={0.2} />
          </mesh>
          {/* Plush Royal Executive Rug Inlay */}
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[10, 14]} />
            <meshStandardMaterial color="#2e1065" roughness={0.7} metalness={0.1} />
          </mesh>
          {/* Gold / Purple Edge Border */}
          <mesh position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4.9, 5.0, 4]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
        </group>

        {/* North Mezzanine Promenade (AI Manager & Strategy Command) */}
        <group position={[0, -0.1, -12]}>
          <mesh receiveShadow>
            <boxGeometry args={[14, 0.2, 10]} />
            <meshStandardMaterial color="#1e1b4b" roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[13.4, 9.4]} />
            <meshStandardMaterial color="#2e1065" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.12, 4.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[13.6, 0.1]} />
            <meshBasicMaterial color="#c084fc" />
          </mesh>
        </group>

        {/* East Mezzanine Wing (Executive Boardroom) */}
        <group position={[12.5, -0.1, -6]}>
          <mesh receiveShadow>
            <boxGeometry args={[15, 0.2, 22]} />
            <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[14.4, 21.4]} />
            <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[10, 12]} />
            <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>

        {/* South Mezzanine Observation Balcony */}
        <group position={[0, -0.1, 8]}>
          <mesh receiveShadow>
            <boxGeometry args={[12, 0.2, 4]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[11.6, 3.6]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.4} />
          </mesh>
        </group>

        {/* Mezzanine Balustrades (Glass & Brushed Steel Railings overlooking Atrium) */}
        {/* South Inner Railing */}
        <group position={[0, 0.5, 5.9]}>
          <mesh>
            <boxGeometry args={[10.4, 0.8, 0.05]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.9} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[10.6, 0.06, 0.08]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
        {/* West Inner Railing */}
        <group position={[-5.1, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 0.8, 11.8]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.9} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.08, 0.06, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
        {/* East Inner Railing */}
        <group position={[5.1, 0.5, 0]}>
          <mesh>
            <boxGeometry args={[0.05, 0.8, 11.8]} />
            <meshPhysicalMaterial color="#38bdf8" transparent opacity={0.2} roughness={0.1} transmission={0.9} />
          </mesh>
          <mesh position={[0, 0.42, 0]}>
            <boxGeometry args={[0.08, 0.06, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
