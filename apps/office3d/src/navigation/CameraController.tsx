import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useOfficeStore } from "../state/officeStore";
import { DepartmentKey, DEPARTMENT_PRESETS } from "./DepartmentPresets";

export interface CameraControllerProps {
  currentDepartment?: DepartmentKey;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  currentDepartment = "overview"
}) => {
  const { camera } = useThree();
  const cameraMode = useOfficeStore((state) => state.cameraMode);
  const ceo = useOfficeStore((state) => state.ceo);

  // Target camera and lookAt vectors
  const currentCamPos = useRef(new THREE.Vector3(0, 18, 22));
  const currentTargetPos = useRef(new THREE.Vector3(0, 1, 0));

  // Mouse orbit state
  const isMouseDown = useRef(false);
  const mouseDelta = useRef({ x: 0, y: 0 });
  const orbitAngle = useRef({ yaw: 0, pitch: 0.35, distance: 5.5 });

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      // Orbit with right mouse click or left drag on canvas
      if (e.button === 2 || (e.button === 0 && (e.target as HTMLElement).tagName === "CANVAS")) {
        isMouseDown.current = true;
      }
    };

    const onMouseUp = () => {
      isMouseDown.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isMouseDown.current) {
        orbitAngle.current.yaw -= e.movementX * 0.005;
        orbitAngle.current.pitch = Math.max(0.1, Math.min(1.2, orbitAngle.current.pitch + e.movementY * 0.005));
      }
    };

    const onWheel = (e: WheelEvent) => {
      orbitAngle.current.distance = Math.max(2.5, Math.min(16.0, orbitAngle.current.distance + e.deltaY * 0.005));
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("wheel", onWheel);

    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  useFrame((_, delta) => {
    const lerpSpeed = Math.min(delta * 5.0, 0.2);

    if (cameraMode === "third-person") {
      // Third-person CEO follow camera
      const ceoPos = new THREE.Vector3(...ceo.position);
      const targetLookAt = new THREE.Vector3(ceoPos.x, ceoPos.y + 1.2, ceoPos.z);

      // Camera offset based on CEO rotation + mouse orbit yaw/pitch
      const totalYaw = ceo.rotationY + orbitAngle.current.yaw;
      const pitch = orbitAngle.current.pitch;
      const dist = orbitAngle.current.distance;

      const camX = ceoPos.x + Math.sin(totalYaw) * dist * Math.cos(pitch);
      const camY = Math.max(ceoPos.y + 0.6, ceoPos.y + dist * Math.sin(pitch) + 0.8);
      const camZ = ceoPos.z + Math.cos(totalYaw) * dist * Math.cos(pitch);

      // Smooth lerp
      currentCamPos.current.lerp(new THREE.Vector3(camX, camY, camZ), lerpSpeed);
      currentTargetPos.current.lerp(targetLookAt, lerpSpeed);

      camera.position.copy(currentCamPos.current);
      camera.lookAt(currentTargetPos.current);
    } else {
      // Overview or Department Preset Camera
      const preset = DEPARTMENT_PRESETS[currentDepartment] || DEPARTMENT_PRESETS.overview;
      const desiredPos = new THREE.Vector3(...preset.cameraPosition);
      const desiredTarget = new THREE.Vector3(...preset.targetPosition);

      currentCamPos.current.lerp(desiredPos, lerpSpeed);
      currentTargetPos.current.lerp(desiredTarget, lerpSpeed);

      camera.position.copy(currentCamPos.current);
      camera.lookAt(currentTargetPos.current);
    }
  });

  return null;
};
