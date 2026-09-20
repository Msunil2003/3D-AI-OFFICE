import { useOfficeStore, FloorLevel } from "../state/officeStore";
import { getStairElevation } from "./StairSystem";
import { FLOOR_HEIGHTS } from "./ElevatorSystem";

export interface CollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  floor: FloorLevel;
}

// Solid obstacles (Desks, Server Racks, Enclosures) on each floor
export const CAMPUS_COLLISION_BOXES: CollisionBox[] = [
  // Engineering Pod Desks (Level 0)
  { minX: -16.2, maxX: -10.8, minZ: -5.6, maxZ: -2.4, floor: 0 },
  { minX: -16.2, maxX: -10.8, minZ: 1.2, maxZ: 3.2, floor: 0 },
  { minX: -10.0, maxX: -7.0, minZ: -7.2, maxZ: -5.8, floor: 0 }, // Arch drafting table

  // QA Lab Rigs (Level 0)
  { minX: 11.0, maxX: 15.0, minZ: 0.5, maxZ: 2.2, floor: 0 },

  // DevOps Monitoring Consoles (Level 0)
  { minX: 10.5, maxX: 16.5, minZ: -10.0, maxZ: -7.5, floor: 0 },

  // Security Operations (Level 0)
  { minX: -15.5, maxX: -11.5, minZ: 11.5, maxZ: 14.5, floor: 0 },

  // Conference Room A Table (Level 0)
  { minX: 11.0, maxX: 16.0, minZ: 12.0, maxZ: 14.0, floor: 0 },

  // War Room Situation Table (Level 0)
  { minX: -2.4, maxX: 2.4, minZ: -13.2, maxZ: -10.8, floor: 0 },

  // Atrium Central Emblem Pedestal (Level 0)
  { minX: -1.4, maxX: 1.4, minZ: -1.4, maxZ: 1.4, floor: 0 },

  // Reception Counter Desk (Level 0)
  { minX: -2.3, maxX: 2.3, minZ: 12.5, maxZ: 13.8, floor: 0 },

  // Server Room Racks (Level -1)
  { minX: -9.0, maxX: 8.0, minZ: -7.0, maxZ: -1.0, floor: -1 },

  // CEO Office Desk & Strategy Table (Level +1)
  { minX: -14.2, maxX: -10.8, minZ: -10.8, maxZ: -9.5, floor: 1 },
  { minX: -14.2, maxX: -10.8, minZ: -5.2, maxZ: -3.2, floor: 1 },

  // Boardroom Table (Level +1)
  { minX: 9.2, maxX: 15.8, minZ: -7.4, maxZ: -4.6, floor: 1 },

  // AI Manager Strategy Rotunda (Level +1)
  { minX: -2.2, maxX: 2.2, minZ: -13.2, maxZ: -10.8, floor: 1 }
];

export class CEOController {
  private keys: Record<string, boolean> = {};
  private walkSpeed = 5.2; // meters/sec
  private sprintSpeed = 8.5; // meters/sec
  private turnSpeed = 2.8; // rad/sec
  private currentY = 0.0;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.onKeyDown);
      window.addEventListener("keyup", this.onKeyUp);
    }
  }

  public destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.onKeyDown);
      window.removeEventListener("keyup", this.onKeyUp);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // If typing in chat input or input box, ignore WASD
    const target = e.target as HTMLElement;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      return;
    }
    this.keys[e.key.toLowerCase()] = true;
    if (e.key === "Shift") this.keys["shift"] = true;

    // TAB key to toggle focus mode (hide/show all HUD elements)
    if (e.key === "Tab") {
      e.preventDefault();
      useOfficeStore.getState().toggleFocusMode();
      return;
    }

    // Trigger Interaction on 'E'
    if (e.key.toLowerCase() === "e") {
      const state = useOfficeStore.getState();
      if (state.activeTarget && !state.activeModal) {
        this.triggerInteraction(state.activeTarget);
      }
    }

    // ESC to close modal, search palette, or attention center
    if (e.key === "Escape") {
      const state = useOfficeStore.getState();
      if (state.searchOpen) {
        state.setSearchOpen(false);
      } else if (state.attentionOpen) {
        state.setAttentionOpen(false);
      } else {
        state.closeAllModals();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
    if (e.key === "Shift") this.keys["shift"] = false;
  };

  public update(delta: number) {
    const store = useOfficeStore.getState();
    const { ceo, isElevatorMoving, elevatorFloor } = store;

    if (!ceo.canMove) {
      if (ceo.isMoving) store.setCeoMoving(false);
      return;
    }

    // If CEO is inside elevator while moving, sync Y
    if (isElevatorMoving) {
      const targetY = FLOOR_HEIGHTS[elevatorFloor];
      store.setCeoPosition([ceo.position[0], targetY, ceo.position[1]]);
      store.setCeoFloor(elevatorFloor);
      return;
    }

    const isSprinting = !!this.keys["shift"];
    const speed = isSprinting ? this.sprintSpeed : this.walkSpeed;

    let moveForward = 0;
    let moveStrafe = 0;
    let turn = 0;

    if (this.keys["w"] || this.keys["arrowup"]) moveForward += 1;
    if (this.keys["s"] || this.keys["arrowdown"]) moveForward -= 1;
    if (this.keys["a"] || this.keys["arrowleft"]) moveStrafe -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) moveStrafe += 1;

    // Optional Q/E or Mouse turning
    if (this.keys["q"]) turn += 1;
    // Don't turn on E as E is interact

    let newRot = ceo.rotationY + turn * this.turnSpeed * delta;

    const isMoving = moveForward !== 0 || moveStrafe !== 0;

    if (!isMoving) {
      if (ceo.isMoving) store.setCeoMoving(false);
      return;
    }

    // Calculate movement vector in world space
    const forwardX = -Math.sin(newRot);
    const forwardZ = -Math.cos(newRot);
    const rightX = Math.cos(newRot);
    const rightZ = -Math.sin(newRot);

    let dx = (forwardX * moveForward + rightX * moveStrafe) * speed * delta;
    let dz = (forwardZ * moveForward + rightZ * moveStrafe) * speed * delta;

    // Potential new coordinates
    let testX = ceo.position[0] + dx;
    let testZ = ceo.position[2] + dz;

    // 1. Boundary Clamping (Perimeter Walls: X [-21, 21], Z [-17.5, 17.5])
    testX = Math.max(-21.0, Math.min(21.0, testX));
    testZ = Math.max(-17.5, Math.min(17.5, testZ));

    // 2. Obstacle Collision Detection
    let isBlocked = false;
    for (const box of CAMPUS_COLLISION_BOXES) {
      if (box.floor === ceo.floor) {
        if (testX >= box.minX && testX <= box.maxX && testZ >= box.minZ && testZ <= box.maxZ) {
          isBlocked = true;
          break;
        }
      }
    }

    if (isBlocked) {
      // Slide along unblocked axis if possible
      let xBlocked = false;
      let zBlocked = false;
      for (const box of CAMPUS_COLLISION_BOXES) {
        if (box.floor === ceo.floor) {
          if (testX >= box.minX && testX <= box.maxX && ceo.position[2] >= box.minZ && ceo.position[2] <= box.maxZ) {
            xBlocked = true;
          }
          if (ceo.position[0] >= box.minX && ceo.position[0] <= box.maxX && testZ >= box.minZ && testZ <= box.maxZ) {
            zBlocked = true;
          }
        }
      }
      if (!xBlocked) testZ = ceo.position[2];
      else if (!zBlocked) testX = ceo.position[0];
      else return; // Fully blocked
    }

    // 3. Continuous Stair Elevation & Floor Level Transition
    let nextY = FLOOR_HEIGHTS[ceo.floor];
    let nextFloor = ceo.floor;

    const stairCheck = getStairElevation(testX, testZ, ceo.floor);
    if (stairCheck && stairCheck.onStairs) {
      nextY = stairCheck.elevation;
      nextFloor = stairCheck.floor;
    }

    // Apply movement
    store.setCeoPosition([testX, nextY, testZ]);
    store.setCeoRotationY(newRot);
    store.setCeoFloor(nextFloor);
    store.setCeoMoving(true, isSprinting);
  }

  private triggerInteraction(target: any) {
    const store = useOfficeStore.getState();
    switch (target.type) {
      case "agent":
        store.setSelectedAgentId(target.metadata?.agentId || null);
        store.setActiveModal("agent-talk");
        break;
      case "workstation":
        if (target.metadata?.agentId) {
          store.setSelectedAgentId(target.metadata.agentId);
        }
        store.setSelectedWorkstationId(target.id);
        store.setActiveModal("workstation-inspect");
        break;
      case "meeting":
        store.setActiveModal("meeting-scheduler");
        break;
      case "elevator":
        store.setActiveModal("elevator-select");
        break;
      case "governance":
        store.setActiveModal("governance-gate");
        break;
      case "task-wall":
        store.setActiveModal("task-kanban");
        break;
      case "manager-table":
        store.setActiveModal("planning-dashboard");
        break;
      case "ceo-display":
        store.setActiveModal("ceo-console");
        break;
      default:
        break;
    }
  }
}
