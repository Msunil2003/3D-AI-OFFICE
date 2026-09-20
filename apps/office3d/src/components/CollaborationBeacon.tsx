import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CollaborationBeaconProps {
  startPos: [number, number, number];
  endPos: [number, number, number];
  active?: boolean;
  color?: string;
}

export const CollaborationBeacon: React.FC<CollaborationBeaconProps> = ({
  startPos,
  endPos,
  active = true,
  color = "#a855f7"
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const particleRef = useRef<THREE.Mesh>(null);

  const startVec = new THREE.Vector3(startPos[0], startPos[1] + 1.2, startPos[2]);
  const endVec = new THREE.Vector3(endPos[0], endPos[1] + 1.2, endPos[2]);
  const midVec = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  midVec.y += 1.5; // Arc upward

  const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
  const points = curve.getPoints(30);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  useFrame((state) => {
    if (particleRef.current && active) {
      const t = (state.clock.elapsedTime * 0.8) % 1;
      const pt = curve.getPoint(t);
      particleRef.current.position.copy(pt);
    }
  });

  if (!active) return null;

  return (
    <group>
      {/* Curved glowing connection line */}
      <primitive
        ref={lineRef}
        object={new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
          })
        )}
      />

      {/* Travelling energy particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
        />
        <pointLight color={color} intensity={1} distance={3} />
      </mesh>
    </group>
  );
};
