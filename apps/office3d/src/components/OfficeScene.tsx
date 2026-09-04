import React, { useRef, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { AgentData } from "../hooks/useOfficeSocket";
import { Desk3D } from "./Desk3D";
import { AgentAvatar3D } from "./AgentAvatar3D";

interface OfficeSceneProps {
  agents: AgentData[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onDeselect: () => void;
}

function agentToWorldPos(desk?: { x: number; y: number }, index = 0): [number, number, number] {
  if (desk && typeof desk.x === "number" && typeof desk.y === "number") {
    // Map 2D pixel coordinates (e.g. 195, 450) to 3D room coordinates
    const worldX = (desk.x - 420) / 45;
    const worldZ = (desk.y - 480) / 45;
    return [worldX, 0, worldZ];
  }
  // Default circular / grid positioning fallback
  const angle = (index / 6) * Math.PI * 2;
  return [Math.cos(angle) * 5, 0, Math.sin(angle) * 5];
}

const STATUS_COLOR_MAP: Record<string, string> = {
  available: "#10b981",
  thinking: "#f59e0b",
  working: "#8b5cf6",
  replied: "#06b6d4",
  error: "#ef4444",
  idle: "#6b7280"
};

const SceneContent: React.FC<OfficeSceneProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  onDeselect
}) => {
  const controlsRef = useRef<any>(null);

  // Focus camera towards selected agent
  useEffect(() => {
    if (selectedAgentId && controlsRef.current) {
      const agent = agents.find((a) => a.agentId === selectedAgentId);
      if (agent) {
        const idx = agents.indexOf(agent);
        const [targetX, targetY, targetZ] = agentToWorldPos(agent.desk, idx);
        controlsRef.current.target.set(targetX, targetY + 0.8, targetZ);
        controlsRef.current.update();
      }
    }
  }, [selectedAgentId, agents]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        maxPolarAngle={Math.PI / 2.15}
        minDistance={3}
        maxDistance={28}
        enableDamping
        dampingFactor={0.06}
      />

      {/* Lighting setup */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[12, 18, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#93c5fd" />

      {/* Office Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        onClick={onDeselect}
      >
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial color="#0b101b" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Cyberpunk grid overlay */}
      <Grid
        position={[0, 0.001, 0]}
        args={[36, 36]}
        cellSize={1}
        cellThickness={0.7}
        cellColor="#1e293b"
        sectionSize={4}
        sectionThickness={1.2}
        sectionColor="#334155"
        fadeDistance={28}
        fadeStrength={1}
      />

      {/* Office Room Boundaries */}
      <mesh position={[0, 3, -18]}>
        <boxGeometry args={[36, 6, 0.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      <mesh position={[-18, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[36, 6, 0.4]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>

      {/* Default Office Hub Desks if empty */}
      {agents.length === 0 && (
        <group position={[0, 0, 0]}>
          <Desk3D position={[-3, 0, -2]} statusColor="#3b82f6" />
          <Desk3D position={[3, 0, -2]} statusColor="#8b5cf6" />
          <Desk3D position={[0, 0, 2]} statusColor="#10b981" />
        </group>
      )}

      {/* Render Agents and their Desks */}
      {agents.map((agent, index) => {
        const pos = agentToWorldPos(agent.desk, index);
        const isSelected = agent.agentId === selectedAgentId;
        const color = STATUS_COLOR_MAP[agent.status] || "#3b82f6";

        return (
          <React.Fragment key={agent.agentId}>
            <Desk3D
              position={pos}
              statusColor={color}
              isSelected={isSelected}
            />
            <AgentAvatar3D
              agent={agent}
              position={pos}
              isSelected={isSelected}
              onSelect={() => onSelectAgent(agent.agentId)}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export const OfficeScene: React.FC<OfficeSceneProps> = (props) => {
  return (
    <div className="canvas-container">
      <Canvas
        shadows
        camera={{ position: [0, 10, 14], fov: 48 }}
        gl={{ antialias: true }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
};
