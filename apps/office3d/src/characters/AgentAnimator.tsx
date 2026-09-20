import * as THREE from "three";

export interface AnimationRefs {
  leftArm: THREE.Group | null;
  rightArm: THREE.Group | null;
  leftLeg: THREE.Group | null;
  rightLeg: THREE.Group | null;
  torso: THREE.Group | null;
  head: THREE.Group | null;
}

export function updateAgentProceduralAnimation(
  refs: AnimationRefs,
  animationType: "idle" | "typing" | "thinking" | "walking" | "frustrated" | "meeting" | "celebrating",
  time: number,
  isMoving: boolean
) {
  if (isMoving || animationType === "walking") {
    // Walking stride
    const walkSpeed = 6.2;
    if (refs.leftLeg) refs.leftLeg.rotation.x = Math.sin(time * walkSpeed) * 0.45;
    if (refs.rightLeg) refs.rightLeg.rotation.x = -Math.sin(time * walkSpeed) * 0.45;
    if (refs.leftArm) refs.leftArm.rotation.x = -Math.sin(time * walkSpeed) * 0.35;
    if (refs.rightArm) refs.rightArm.rotation.x = Math.sin(time * walkSpeed) * 0.35;
    if (refs.torso) refs.torso.position.y = 0.72 + Math.abs(Math.sin(time * walkSpeed * 2)) * 0.04;
    return;
  }

  // Seated posture (default legs bent)
  if (refs.leftLeg) refs.leftLeg.rotation.x = Math.PI / 2.2;
  if (refs.rightLeg) refs.rightLeg.rotation.x = Math.PI / 2.2;

  switch (animationType) {
    case "typing": {
      const typeSpeed = 13;
      if (refs.leftArm) {
        refs.leftArm.rotation.x = -Math.PI / 3 + Math.sin(time * typeSpeed) * 0.14;
        refs.leftArm.rotation.y = 0.2;
      }
      if (refs.rightArm) {
        refs.rightArm.rotation.x = -Math.PI / 3 + Math.cos(time * typeSpeed + 1) * 0.14;
        refs.rightArm.rotation.y = -0.2;
      }
      if (refs.head) refs.head.rotation.x = 0.15 + Math.sin(time * 2) * 0.03;
      if (refs.torso) refs.torso.position.y = 0.58 + Math.sin(time * 3) * 0.01;
      break;
    }
    case "thinking": {
      if (refs.rightArm) {
        refs.rightArm.rotation.x = -Math.PI / 2.2;
        refs.rightArm.rotation.y = -0.35;
      }
      if (refs.leftArm) {
        refs.leftArm.rotation.x = -Math.PI / 4;
        refs.leftArm.rotation.y = 0.1;
      }
      if (refs.head) {
        refs.head.rotation.z = Math.sin(time * 1.5) * 0.06;
        refs.head.rotation.x = 0.08;
      }
      break;
    }
    case "frustrated": {
      if (refs.head) {
        refs.head.rotation.y = Math.sin(time * 4) * 0.22;
        refs.head.rotation.x = 0.2;
      }
      if (refs.leftArm) refs.leftArm.rotation.x = -Math.PI / 4;
      if (refs.rightArm) refs.rightArm.rotation.x = -Math.PI / 4;
      break;
    }
    case "celebrating": {
      if (refs.leftArm) refs.leftArm.rotation.x = -Math.PI * 0.8 + Math.sin(time * 6) * 0.2;
      if (refs.rightArm) refs.rightArm.rotation.x = -Math.PI * 0.8 + Math.cos(time * 6) * 0.2;
      break;
    }
    case "meeting":
    case "idle":
    default: {
      if (refs.leftArm) refs.leftArm.rotation.x = -Math.PI / 4;
      if (refs.rightArm) refs.rightArm.rotation.x = -Math.PI / 4;
      if (refs.torso) refs.torso.position.y = 0.58 + Math.sin(time * 2) * 0.008;
      break;
    }
  }
}
