import React from "react";
import { Text } from "@react-three/drei";

export interface WorkstationProps {
  id: string;
  name: string;
  role?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  monitorCount?: 1 | 2 | 3;
  taskTitle?: string;
  taskStatus?: "IN_PROGRESS" | "IN_REVIEW" | "APPROVAL" | "DONE" | "BLOCKED" | "IDLE" | string;
  isBlocked?: boolean;
  blockReason?: string;
  hasPendingApproval?: boolean;
  screenContent?: "code" | "testing" | "terminal" | "architecture" | "metrics";
  onInspect?: () => void;
  isOccupied?: boolean;
  agentStatus?: "working" | "thinking" | "idle" | "in_meeting" | "error" | string;
}

export const Workstation3D: React.FC<WorkstationProps> = ({
  id,
  name,
  role = "Software Engineer",
  position,
  rotation = [0, 0, 0],
  monitorCount = 2,
  taskTitle = "Active Engineering Session",
  taskStatus = "IN_PROGRESS",
  isBlocked = false,
  blockReason,
  hasPendingApproval = false,
  screenContent = "code",
  onInspect,
  isOccupied = true,
  agentStatus = "working"
}) => {
  const effectiveBlocked = isBlocked || taskStatus === "BLOCKED" || agentStatus === "error";
  const effectiveApproval = hasPendingApproval || taskStatus === "APPROVAL";
  const effectiveReview = taskStatus === "IN_REVIEW";
  const effectiveDone = taskStatus === "DONE";
  const effectiveMeeting = agentStatus === "in_meeting";
  const effectiveIdle = agentStatus === "idle" || !isOccupied;

  const stateColor = effectiveBlocked
    ? "#ef4444"
    : effectiveApproval
    ? "#f59e0b"
    : effectiveReview || effectiveDone
    ? "#10b981"
    : effectiveMeeting
    ? "#06b6d4"
    : effectiveIdle
    ? "#64748b"
    : "#3b82f6";

  const stateLabel = effectiveBlocked
    ? `BLOCKED • ${blockReason || "Dependency Resolution"}`
    : effectiveApproval
    ? "GATE PENDING • Executive Sign-Off"
    : effectiveReview
    ? "IN REVIEW • Regression Tests Passed"
    : effectiveDone
    ? "COMPLETED • Merged to Main"
    : effectiveMeeting
    ? "IN SESSION • Conference Room A"
    : effectiveIdle
    ? "STANDBY • Awaiting Task"
    : "ACTIVE • Autonomous Execution";

  const getScreenColor = () => {
    if (effectiveBlocked) return { bg: "#2d0607", text: "#fca5a5", glow: "#ef4444" };
    if (effectiveApproval) return { bg: "#2b1802", text: "#fde68a", glow: "#f59e0b" };
    if (effectiveIdle) return { bg: "#080c14", text: "#64748b", glow: "#1e293b" };
    if (effectiveMeeting) return { bg: "#041b24", text: "#67e8f9", glow: "#06b6d4" };

    switch (screenContent) {
      case "testing": return { bg: "#064e3b", text: "#34d399", glow: "#10b981" };
      case "terminal": return { bg: "#0f172a", text: "#38bdf8", glow: "#0284c7" };
      case "architecture": return { bg: "#2e1065", text: "#c084fc", glow: "#a855f7" };
      case "metrics": return { bg: "#083344", text: "#22d3ee", glow: "#06b6d4" };
      case "code":
      default:
        return { bg: "#090d16", text: "#60a5fa", glow: "#3b82f6" };
    }
  };

  const colors = getScreenColor();

  return (
    <group position={position} rotation={rotation} name={`workstation-${id}`}>
      {/* 1. DESK SLAB & FRAME */}
      {/* Wooden / Composite Desk Surface (1.8m x 0.9m) */}
      <mesh position={[0, 0.73, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.05, 0.9]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Beveled Top Mat Inlay */}
      <mesh position={[0, 0.756, 0.05]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.6, 0.7]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Modern T-Leg Desk Supports (Black Matte Metal) */}
      <mesh position={[-0.8, 0.36, 0]} castShadow>
        <boxGeometry args={[0.06, 0.72, 0.7]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0.8, 0.36, 0]} castShadow>
        <boxGeometry args={[0.06, 0.72, 0.7]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* Cable Tray under desk */}
      <mesh position={[0, 0.55, -0.3]}>
        <boxGeometry args={[1.4, 0.12, 0.15]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>

      {/* 2. ERGONOMIC WORKSTATION CHAIR */}
      <group position={[0, 0, 0.75]}>
        {/* 5-Star Caster Base */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.32, 0.08, 10]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Hydraulic Cylinder */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Seat Cushion */}
        <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.52, 0.08, 0.5]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        {/* Contoured Mesh Backrest */}
        <mesh position={[0, 0.78, 0.24]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.48, 0.62, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </mesh>
        {/* Armrests */}
        <mesh position={[-0.26, 0.58, 0.05]}>
          <boxGeometry args={[0.05, 0.22, 0.24]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        <mesh position={[0.26, 0.58, 0.05]}>
          <boxGeometry args={[0.05, 0.22, 0.24]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      </group>

      {/* 3. COMPUTER MONITORS (1, 2, or 3) */}
      {/* Primary Center Monitor */}
      <group position={[0, 1.05, -0.2]}>
        {/* Stand */}
        <mesh position={[0, -0.2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[0.78, 0.46, 0.025]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Subtle Top Bezel Status Indicator Bar */}
        <mesh position={[0, 0.222, 0.014]}>
          <boxGeometry args={[0.24, 0.008, 0.004]} />
          <meshStandardMaterial
            color={stateColor}
            emissive={stateColor}
            emissiveIntensity={effectiveBlocked || effectiveApproval ? 0.8 : 0.3}
            roughness={0.1}
          />
        </mesh>
        {/* Luminous Display Panel */}
        <mesh position={[0, 0, 0.015]}>
          <planeGeometry args={[0.74, 0.42]} />
          <meshStandardMaterial
            color={colors.bg}
            emissive={colors.glow}
            emissiveIntensity={0.25}
            roughness={0.2}
          />
        </mesh>
        {/* Screen State Indicator Header */}
        <Text
          position={[-0.34, 0.175, 0.02]}
          fontSize={0.024}
          color={stateColor}
          anchorX="left"
          anchorY="top"
          fontWeight="bold"
          maxWidth={0.68}
        >
          {stateLabel}
        </Text>
        {/* Screen Task Title */}
        <Text
          position={[-0.34, 0.125, 0.02]}
          fontSize={0.033}
          color="#f8fafc"
          anchorX="left"
          anchorY="top"
          maxWidth={0.68}
        >
          {taskTitle.slice(0, 36)}
        </Text>
      </group>

      {/* Left Monitor (if >= 2) */}
      {monitorCount >= 2 && (
        <group position={[-0.72, 1.05, -0.12]} rotation={[0, 0.26, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[0.68, 0.44, 0.025]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <planeGeometry args={[0.64, 0.4]} />
            <meshStandardMaterial
              color="#090d16"
              emissive="#38bdf8"
              emissiveIntensity={0.18}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* Right Monitor (if === 3) */}
      {monitorCount === 3 && (
        <group position={[0.72, 1.05, -0.12]} rotation={[0, -0.26, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[0.68, 0.44, 0.025]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <planeGeometry args={[0.64, 0.4]} />
            <meshStandardMaterial
              color="#090d16"
              emissive="#10b981"
              emissiveIntensity={0.18}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* 4. KEYBOARD & MOUSEPAD */}
      <group position={[0, 0.76, 0.18]}>
        {/* Keyboard Chassis */}
        <mesh castShadow>
          <boxGeometry args={[0.44, 0.018, 0.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Mechanical Keycaps */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.42, 0.008, 0.14]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        {/* Mousepad & Mouse */}
        <mesh position={[0.34, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.2, 0.24]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>
        <mesh position={[0.34, 0.02, 0]} castShadow>
          <boxGeometry args={[0.06, 0.025, 0.1]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* 5. ACCESSORIES: DESK LAMP, COFFEE MUG, WORKSTATION ID */}
      {/* Mini Desk Lamp */}
      <group position={[-0.7, 0.76, 0.2]}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.03, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.32, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
        <mesh position={[0.06, 0.34, 0]} rotation={[0, 0, -0.4]}>
          <coneGeometry args={[0.06, 0.1, 12]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Subtle Local Task Light */}
        <pointLight
          position={[0.06, 0.3, 0]}
          color={effectiveBlocked ? "#fed7aa" : "#fef08a"}
          intensity={effectiveIdle || effectiveMeeting ? 0.05 : 0.45}
          distance={1.8}
        />
      </group>

      {/* Coffee Mug */}
      <group position={[0.65, 0.76, 0.22]}>
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.09, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
      </group>

      {/* Desktop PC Under Desk */}
      <mesh position={[0.68, 0.28, -0.1]} castShadow>
        <boxGeometry args={[0.18, 0.44, 0.44]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Subtle Workstation Nameplate */}
      <group position={[0, 0.65, 0.46]}>
        <mesh position={[-0.32, 0, 0]}>
          <circleGeometry args={[0.016, 12]} />
          <meshBasicMaterial color={stateColor} />
        </mesh>
        <Text
          position={[0, 0, 0]}
          fontSize={0.06}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
      </group>
    </group>
  );
};
