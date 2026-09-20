import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface TaskHologramProps {
  position: [number, number, number];
  taskId: string;
  title: string;
  status: string;
  risk?: string;
  progressPercent?: number;
}

export const TaskHologram: React.FC<TaskHologramProps> = ({
  position,
  taskId,
  title,
  status,
  risk = "MEDIUM",
  progressPercent = 75
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Subtle floating levitation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.04;
    }
  });

  const isBlocked = status === "blocked" || status === "error" || status === "RECOVERY_REQUIRED";
  const statusColor = isBlocked ? "#ef4444" : status === "TESTING" ? "#10b981" : "#38bdf8";

  return (
    <group ref={groupRef} position={position}>
      {/* Holographic Plate Backdrop */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.6, 0.65]} />
        <meshBasicMaterial color="#0b1329" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>

      {/* Holographic Border Outline */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[1.62, 0.67]} />
        <meshBasicMaterial color={statusColor} wireframe side={THREE.DoubleSide} />
      </mesh>

      {/* Task ID Header */}
      <Text
        position={[-0.72, 0.2, 0.01]}
        fontSize={0.065}
        color={statusColor}
        anchorX="left"
        anchorY="middle"
        fontWeight="bold"
      >
        {`[TASK #${taskId.slice(0, 8)}]`}
      </Text>

      {/* Risk Tag */}
      <Text
        position={[0.72, 0.2, 0.01]}
        fontSize={0.055}
        color={risk === "HIGH" ? "#ef4444" : "#f59e0b"}
        anchorX="right"
        anchorY="middle"
        fontWeight="bold"
      >
        {`${risk} RISK`}
      </Text>

      {/* Task Title */}
      <Text
        position={[-0.72, 0.06, 0.01]}
        fontSize={0.058}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        maxWidth={1.44}
      >
        {title.length > 40 ? title.slice(0, 38) + "..." : title}
      </Text>

      {/* Progress Bar Background */}
      <mesh position={[0, -0.16, 0.01]}>
        <planeGeometry args={[1.4, 0.04]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      {/* Progress Bar Fill */}
      <mesh position={[-0.7 + (1.4 * (progressPercent / 100)) / 2, -0.16, 0.015]}>
        <planeGeometry args={[1.4 * (progressPercent / 100), 0.04]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>
    </group>
  );
};
