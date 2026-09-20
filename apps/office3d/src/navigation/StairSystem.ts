import { FloorLevel } from "../state/officeStore";

export interface StairZone {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  bottomFloor: FloorLevel;
  topFloor: FloorLevel;
  bottomY: number;
  topY: number;
  bottomZ: number;
  topZ: number;
}

export const STAIR_ZONES: StairZone[] = [
  // Grand Staircase (Level 0 -> Level +1) on West Atrium Spine
  {
    id: "grand-staircase",
    name: "Executive Grand Staircase",
    minX: -4.8,
    maxX: -2.8,
    minZ: -2.8,
    maxZ: 3.6,
    bottomFloor: 0,
    topFloor: 1,
    bottomY: 0.0,
    topY: 4.2,
    bottomZ: 3.5,
    topZ: -2.5
  },
  // Infrastructure Access Stairway (Level 0 -> Level -1) on East Atrium Spine
  {
    id: "infra-staircase",
    name: "Infrastructure Service Stairway",
    minX: 2.8,
    maxX: 4.8,
    minZ: -1.2,
    maxZ: 4.2,
    bottomFloor: -1,
    topFloor: 0,
    bottomY: -4.0,
    topY: 0.0,
    bottomZ: -1.0,
    topZ: 4.0
  }
];

export function getStairElevation(x: number, z: number, currentFloor: FloorLevel): { onStairs: boolean; elevation: number; floor: FloorLevel } | null {
  for (const zone of STAIR_ZONES) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
      // Calculate interpolation progress (0.0 at bottomZ to 1.0 at topZ)
      const t = Math.max(0, Math.min(1, (z - zone.bottomZ) / (zone.topZ - zone.bottomZ)));
      const elevation = zone.bottomY + t * (zone.topY - zone.bottomY);
      const floor = t > 0.5 ? zone.topFloor : zone.bottomFloor;
      return { onStairs: true, elevation, floor };
    }
  }
  return null;
}
