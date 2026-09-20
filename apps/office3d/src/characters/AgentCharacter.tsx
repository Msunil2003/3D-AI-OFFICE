import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AgentData } from "../hooks/useOfficeSocket";
import { getAgentVisualBehavior } from "../state/AgentBehaviorMap";
import { AgentNameplate } from "./AgentNameplate";

interface AgentCharacterProps {
  agent: AgentData;
  position: [number, number, number];
  rotation?: [number, number, number];
  isSelected?: boolean;
  onSelect?: () => void;
  currentTaskTitle?: string;
  isSeated?: boolean;
  isMoving?: boolean;
}

export const AgentCharacter: React.FC<AgentCharacterProps> = ({
  agent,
  position,
  rotation = [0, 0, 0],
  isSelected = false,
  onSelect,
  currentTaskTitle,
  isSeated = true,
  isMoving = false
}) => {
  const behavior = getAgentVisualBehavior(agent.status);

  // Animation bone/part references
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  // Procedural Animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (isMoving) {
      // Natural walking stride
      const walkSpeed = 6;
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * walkSpeed) * 0.45;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * walkSpeed) * 0.45;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * walkSpeed) * 0.35;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * walkSpeed) * 0.35;
      if (torsoRef.current) torsoRef.current.position.y = 0.7 + Math.abs(Math.sin(t * walkSpeed * 2)) * 0.04;
      return;
    }

    if (isSeated) {
      // Seated working animations
      if (behavior.animation === "typing") {
        // High-velocity keyboard typing motion
        const typeSpeed = 14;
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -Math.PI / 3 + Math.sin(t * typeSpeed) * 0.12;
          leftArmRef.current.rotation.y = 0.2;
        }
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -Math.PI / 3 + Math.cos(t * typeSpeed + 1) * 0.12;
          rightArmRef.current.rotation.y = -0.2;
        }
        if (headRef.current) {
          headRef.current.rotation.x = 0.15 + Math.sin(t * 2) * 0.03;
        }
        if (torsoRef.current) {
          torsoRef.current.position.y = 0.58 + Math.sin(t * 3) * 0.01;
        }
      } else if (behavior.animation === "thinking") {
        // Hand to chin thinking pose
        if (rightArmRef.current) {
          rightArmRef.current.rotation.x = -Math.PI / 2.2;
          rightArmRef.current.rotation.y = -0.35;
        }
        if (leftArmRef.current) {
          leftArmRef.current.rotation.x = -Math.PI / 4;
          leftArmRef.current.rotation.y = 0.1;
        }
        if (headRef.current) {
          headRef.current.rotation.z = Math.sin(t * 1.5) * 0.06;
          headRef.current.rotation.x = 0.05;
        }
      } else if (behavior.animation === "frustrated") {
        // Blocked: head shake & warning posture
        if (headRef.current) {
          headRef.current.rotation.y = Math.sin(t * 4) * 0.2;
          headRef.current.rotation.x = 0.2;
        }
        if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI / 4;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI / 4;
      } else {
        // Idle / Meeting calm posture
        if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI / 4;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI / 4;
        if (torsoRef.current) torsoRef.current.position.y = 0.58 + Math.sin(t * 2) * 0.008;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
    >
      {/* Nameplate above character */}
      <AgentNameplate
        name={agent.name}
        role={agent.provider ? `Engineer (${agent.provider})` : "Senior Software Engineer"}
        behavior={behavior}
        currentTask={currentTaskTitle}
        isSelected={isSelected}
      />

      {/* Selection Cylinder Ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.65, 0.72, 32]} />
          <meshBasicMaterial color="#818cf8" />
        </mesh>
      )}

      {/* --- HUMANOID 3D AVATAR MESHES --- */}
      {/* Torso with Engineering Jacket */}
      <group ref={torsoRef} position={[0, isSeated ? 0.58 : 0.7, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.44, 0.22]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Department/Status Accent Stripe */}
        <mesh position={[0, 0, 0.115]}>
          <planeGeometry args={[0.08, 0.4]} />
          <meshBasicMaterial color={behavior.color} />
        </mesh>

        {/* Head & Headset */}
        <group ref={headRef} position={[0, 0.36, 0]}>
          {/* Head */}
          <mesh castShadow>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#fed7aa" roughness={0.7} />
          </mesh>
          {/* Hair / Cap */}
          <mesh position={[0, 0.05, -0.02]} castShadow>
            <sphereGeometry args={[0.165, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          {/* Visor / Eye Optics */}
          <mesh position={[0, 0.02, 0.13]}>
            <boxGeometry args={[0.18, 0.05, 0.04]} />
            <meshBasicMaterial color={behavior.color} />
          </mesh>
          {/* Headset Band */}
          <mesh position={[0, 0.08, 0]}>
            <torusGeometry args={[0.16, 0.018, 8, 24, Math.PI]} />
            <meshStandardMaterial color="#334155" metalness={0.9} />
          </mesh>
          {/* Headset Ear Cup Left */}
          <mesh position={[-0.17, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Headset Ear Cup Right + Boom Mic */}
          <mesh position={[0.17, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.16, -0.05, 0.1]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
            <meshStandardMaterial color="#38bdf8" />
          </mesh>
        </group>

        {/* Left Arm & Hand */}
        <group ref={leftArmRef} position={[-0.24, 0.15, 0]}>
          {/* Upper arm */}
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.18, 4, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.26, 0.05]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#fed7aa" />
          </mesh>
        </group>

        {/* Right Arm & Hand */}
        <group ref={rightArmRef} position={[0.24, 0.15, 0]}>
          {/* Upper arm */}
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.05, 0.18, 4, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.26, 0.05]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color="#fed7aa" />
          </mesh>
        </group>
      </group>

      {/* --- LEGS & SHOES --- */}
      {isSeated ? (
        // Seated Leg Configuration (Bent at 90 degrees)
        <group position={[0, 0.32, 0]}>
          {/* Left Thigh (Horizontal) */}
          <mesh position={[-0.11, 0.12, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.22, 4, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Left Shin (Vertical down to floor) */}
          <mesh position={[-0.11, -0.1, 0.28]} castShadow>
            <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Left Shoe */}
          <mesh position={[-0.11, -0.28, 0.34]}>
            <boxGeometry args={[0.09, 0.07, 0.16]} />
            <meshStandardMaterial color="#334155" roughness={0.4} />
          </mesh>

          {/* Right Thigh (Horizontal) */}
          <mesh position={[0.11, 0.12, 0.16]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.06, 0.22, 4, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Right Shin (Vertical down to floor) */}
          <mesh position={[0.11, -0.1, 0.28]} castShadow>
            <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Right Shoe */}
          <mesh position={[0.11, -0.28, 0.34]}>
            <boxGeometry args={[0.09, 0.07, 0.16]} />
            <meshStandardMaterial color="#334155" roughness={0.4} />
          </mesh>
        </group>
      ) : (
        // Standing / Walking Leg Configuration
        <group position={[0, 0.35, 0]}>
          <group ref={leftLegRef} position={[-0.11, 0, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.34, 4, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, -0.33, 0.04]}>
              <boxGeometry args={[0.09, 0.07, 0.16]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
          <group ref={rightLegRef} position={[0.11, 0, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow>
              <capsuleGeometry args={[0.06, 0.34, 4, 8]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, -0.33, 0.04]}>
              <boxGeometry args={[0.09, 0.07, 0.16]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};
