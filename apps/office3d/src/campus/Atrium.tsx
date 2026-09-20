import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export const Atrium: React.FC = () => {
  const emblemRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (emblemRef.current) {
      emblemRef.current.rotation.y = t * 0.25;
      emblemRef.current.position.y = 2.4 + Math.sin(t * 1.8) * 0.08;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 0.4;
    }
  });

  return (
    <group position={[0, 0, 0]} name="campus-central-atrium">
      {/* Central Holographic Company Emblem Pedestal */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.5, 0.8, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Luminous Core Ring on Pedestal Top */}
      <mesh position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.15, 32]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Floating 3D Company Emblem Geometry */}
      <group ref={emblemRef} position={[0, 2.4, 0]}>
        {/* Diamond Hologram Core */}
        <mesh castShadow>
          <octahedronGeometry args={[0.65, 0]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.6}
            roughness={0.1}
            metalness={0.9}
            wireframe={false}
          />
        </mesh>
        {/* Orbiting Orbital Ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.05, 0.03, 16, 48]} />
          <meshBasicMaterial color="#818cf8" />
        </mesh>

        {/* Floating Typography */}
        <Text
          position={[0, 0.9, 0]}
          fontSize={0.22}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.16}
          fontWeight="bold"
        >
          AIOFFICE
        </Text>
        <Text
          position={[0, 0.68, 0]}
          fontSize={0.11}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          AUTONOMOUS SOFTWARE HQ
        </Text>
      </group>

      {/* Circular Atrium Architectural Bench Seating */}
      {[-3.2, 3.2].map((x, i) => (
        <group key={`atrium-bench-${i}`} position={[x, 0, 0]}>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.45, 3.2]} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.48, 0]} castShadow>
            <boxGeometry args={[0.92, 0.08, 3.1]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Atrium Architectural Planters */}
      {[
        [-3.2, -2.4], [-3.2, 2.4], [3.2, -2.4], [3.2, 2.4]
      ].map(([px, pz], i) => (
        <group key={`atrium-plant-${i}`} position={[px, 0, pz]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.45, 0.38, 0.7, 16]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.95, 0]} castShadow>
            <sphereGeometry args={[0.48, 12, 10]} />
            <meshStandardMaterial color="#10b981" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
