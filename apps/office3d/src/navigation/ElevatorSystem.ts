import { FloorLevel } from "../state/officeStore";

export interface ElevatorState {
  currentFloor: FloorLevel;
  targetFloor: FloorLevel | null;
  cabY: number;
  doorOpen: number; // 0 = closed, 1 = open
  isMoving: boolean;
}

export const FLOOR_HEIGHTS: Record<FloorLevel, number> = {
  "-1": -4.0,
  "0": 0.0,
  "1": 4.2
};

export const ELEVATOR_POSITION: [number, number, number] = [4.2, 0, -2.5];

export class ElevatorSystem {
  private state: ElevatorState = {
    currentFloor: 0,
    targetFloor: null,
    cabY: 0.0,
    doorOpen: 1.0,
    isMoving: false
  };

  public getState(): ElevatorState {
    return { ...this.state };
  }

  public callElevator(floor: FloorLevel) {
    if (this.state.currentFloor === floor && !this.state.isMoving) {
      this.state.doorOpen = 1.0;
      return;
    }
    this.state.targetFloor = floor;
    this.state.isMoving = true;
    this.state.doorOpen = 0.0;
  }

  public update(delta: number): boolean {
    if (!this.state.isMoving || this.state.targetFloor === null) {
      return false;
    }

    const targetY = FLOOR_HEIGHTS[this.state.targetFloor];
    const speed = 4.0; // meters per sec
    const diff = targetY - this.state.cabY;

    if (Math.abs(diff) < 0.05) {
      this.state.cabY = targetY;
      this.state.currentFloor = this.state.targetFloor;
      this.state.targetFloor = null;
      this.state.isMoving = false;
      this.state.doorOpen = 1.0;
      return true; // Reached floor
    } else {
      this.state.cabY += Math.sign(diff) * speed * delta;
      return false;
    }
  }
}
