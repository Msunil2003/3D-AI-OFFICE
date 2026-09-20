import * as THREE from "three";

export class MovementController {
  private path: [number, number, number][] = [];
  private currentWaypointIndex = 0;
  private currentPosition: [number, number, number];
  private currentRotationY = 0;
  private speed = 3.8; // meters/sec
  private isFinished = true;

  constructor(initialPosition: [number, number, number]) {
    this.currentPosition = [...initialPosition];
  }

  public setPath(path: [number, number, number][]) {
    if (path.length === 0) return;
    this.path = path;
    this.currentWaypointIndex = 0;
    this.isFinished = false;
  }

  public update(delta: number): { position: [number, number, number]; rotationY: number; isMoving: boolean } {
    if (this.isFinished || this.path.length === 0) {
      return {
        position: this.currentPosition,
        rotationY: this.currentRotationY,
        isMoving: false
      };
    }

    const target = this.path[this.currentWaypointIndex];
    const dx = target[0] - this.currentPosition[0];
    const dy = target[1] - this.currentPosition[1];
    const dz = target[2] - this.currentPosition[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.15) {
      this.currentWaypointIndex += 1;
      if (this.currentWaypointIndex >= this.path.length) {
        this.isFinished = true;
        this.currentPosition = [...target];
        return {
          position: this.currentPosition,
          rotationY: this.currentRotationY,
          isMoving: false
        };
      }
    } else {
      const step = Math.min(dist, this.speed * delta);
      this.currentPosition[0] += (dx / dist) * step;
      this.currentPosition[1] += (dy / dist) * step;
      this.currentPosition[2] += (dz / dist) * step;

      // Face toward movement direction
      const targetAngle = Math.atan2(-dx, -dz);
      this.currentRotationY = THREE.MathUtils.lerp(this.currentRotationY, targetAngle, delta * 8);
    }

    return {
      position: this.currentPosition,
      rotationY: this.currentRotationY,
      isMoving: true
    };
  }

  public getPosition(): [number, number, number] {
    return this.currentPosition;
  }
}
