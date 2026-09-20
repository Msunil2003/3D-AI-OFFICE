import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export interface CEOCharacterProps {
  position: [number, number, number];
  rotationY: number;
  isMoving?: boolean;
  isSprinting?: boolean;
}

export const CEOCharacter: React.FC<CEOCharacterProps> = ({
  position,
  rotationY,
  isMoving = false,
  isSprinting = false
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  // Smooth procedural walking animation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const walkFreq = isSprinting ? 9.5 : 6.0;

    if (isMoving) {
      // Natural walking / sprinting stride
      const legAmp = isSprinting ? 0.6 : 0.4;
      const armAmp = isSprinting ? 0.5 : 0.3;

      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t * walkFreq) * legAmp;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(t * walkFreq) * legAmp;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(t * walkFreq) * armAmp;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(t * walkFreq) * armAmp;
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.88 + Math.abs(Math.sin(t * walkFreq * 2)) * 0.04;
      }
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * walkFreq) * 0.05;
      }
    } else {
      // Natural breathing & idle executive posture
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -0.1 + Math.sin(t * 1.5) * 0.02;
        leftArmRef.current.rotation.z = 0.12;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -0.1 + Math.cos(t * 1.5) * 0.02;
        rightArmRef.current.rotation.z = -0.12;
      }
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.88 + Math.sin(t * 2) * 0.008;
      }
      if (headRef.current) {
        headRef.current.rotation.y = Math.sin(t * 0.8) * 0.06;
      }
    }
  });

  return (
    <group ref={rootRef} position={position} rotation={[0, rotationY, 0]} name="ceo-player-avatar">
      {/* 1. SOFT EXECUTIVE GROUND SHADOW */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>

      {/* 2. LEGS & EXECUTIVE POLISHED OXFORDS */}
      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.11, 0.52, 0]}>
        {/* Charcoal Trouser Thigh & Calf */}
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.055, 0.44, 10]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        {/* Leather Oxford Shoe */}
        <mesh position={[0, -0.46, 0.04]} castShadow>
          <boxGeometry args={[0.1, 0.08, 0.2]} />
          <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.6} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.11, 0.52, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.055, 0.44, 10]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.46, 0.04]} castShadow>
          <boxGeometry args={[0.1, 0.08, 0.2]} />
          <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.6} />
        </mesh>
      </group>

      {/* 3. TORSO & TAILORED SUIT BLAZER */}
      <group ref={torsoRef} position={[0, 0.88, 0]}>
        {/* Tailored Midnight Navy Blazer Jacket */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.36, 0.5, 0.2]} />
          <meshStandardMaterial color="#172554" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* White Dress Shirt V-Neck Inset */}
        <mesh position={[0, 0.08, 0.102]}>
          <planeGeometry args={[0.14, 0.28]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        {/* Silk Cyan Executive Tie */}
        <mesh position={[0, 0.04, 0.104]}>
          <planeGeometry args={[0.04, 0.26]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.3} />
        </mesh>
        {/* Gold Lapel Pin Badge */}
        <mesh position={[-0.12, 0.16, 0.105]}>
          <circleGeometry args={[0.015, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>

        {/* 4. ARMS & BLAZER SLEEVES */}
        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.22, 0.18, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.38, 10]} />
            <meshStandardMaterial color="#172554" roughness={0.4} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.38, 0]} castShadow>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#f8d7b8" roughness={0.7} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.22, 0.18, 0]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.38, 10]} />
            <meshStandardMaterial color="#172554" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.38, 0]} castShadow>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#f8d7b8" roughness={0.7} />
          </mesh>
        </group>

        {/* 5. HEAD, HAIR, AND EXECUTIVE GLASSES */}
        <group ref={headRef} position={[0, 0.38, 0]}>
          {/* Neck */}
          <mesh position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.04, 0.045, 0.08, 8]} />
            <meshStandardMaterial color="#f8d7b8" roughness={0.7} />
          </mesh>
          {/* Head */}
          <mesh castShadow>
            <sphereGeometry args={[0.13, 16, 14]} />
            <meshStandardMaterial color="#f8d7b8" roughness={0.65} />
          </mesh>
          {/* Modern Styled Hair */}
          <mesh position={[0, 0.06, -0.01]} castShadow>
            <sphereGeometry args={[0.138, 16, 14]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          {/* Executive Glasses Frame */}
          <mesh position={[0, 0.01, 0.12]}>
            <boxGeometry args={[0.16, 0.04, 0.02]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* 6. FOUNDER / CEO FLOATING NAMEPLATE */}
      <group position={[0, 1.78, 0]}>
        {/* Subtle Gold / Cyan Badge Plaque */}
        <mesh>
          <planeGeometry args={[1.3, 0.28]} />
          <meshBasicMaterial color="#090d16" transparent opacity={0.88} />
        </mesh>
        {/* Outer gold rim */}
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[1.34, 0.32]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <Text
          position={[0, 0.04, 0.01]}
          fontSize={0.09}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
          letterSpacing={0.12}
        >
          FOUNDER / CEO
        </Text>
        <Text
          position={[0, -0.07, 0.01]}
          fontSize={0.055}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          EXECUTIVE AUTHORITY
        </Text>
      </group>
    </group>
  );
};
