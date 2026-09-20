import { CAMPUS_WAYPOINTS, Waypoint } from "./NavigationGraph";

export function findPath(startId: string, goalId: string): [number, number, number][] {
  if (!CAMPUS_WAYPOINTS[startId] || !CAMPUS_WAYPOINTS[goalId]) {
    return [CAMPUS_WAYPOINTS[startId]?.position || [0, 0, 0]];
  }

  if (startId === goalId) {
    return [CAMPUS_WAYPOINTS[startId].position];
  }

  const openSet = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();

  const gScore = new Map<string, number>();
  gScore.set(startId, 0);

  const fScore = new Map<string, number>();
  fScore.set(startId, heuristic(CAMPUS_WAYPOINTS[startId], CAMPUS_WAYPOINTS[goalId]));

  while (openSet.size > 0) {
    // Find node with lowest fScore
    let currentId = Array.from(openSet).reduce((lowest, node) => {
      const currentF = fScore.get(node) ?? Infinity;
      const lowestF = fScore.get(lowest) ?? Infinity;
      return currentF < lowestF ? node : lowest;
    });

    if (currentId === goalId) {
      // Reconstruct path
      const path: [number, number, number][] = [];
      let curr: string | undefined = currentId;
      while (curr) {
        path.unshift(CAMPUS_WAYPOINTS[curr].position);
        curr = cameFrom.get(curr);
      }
      return path;
    }

    openSet.delete(currentId);
    const current = CAMPUS_WAYPOINTS[currentId];

    for (const neighborId of current.neighbors) {
      const neighbor = CAMPUS_WAYPOINTS[neighborId];
      if (!neighbor) continue;

      const tentativeG = (gScore.get(currentId) ?? Infinity) + dist(current.position, neighbor.position);

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);
        fScore.set(neighborId, tentativeG + heuristic(neighbor, CAMPUS_WAYPOINTS[goalId]));
        openSet.add(neighborId);
      }
    }
  }

  // Fallback direct start to goal
  return [CAMPUS_WAYPOINTS[startId].position, CAMPUS_WAYPOINTS[goalId].position];
}

function heuristic(a: Waypoint, b: Waypoint): number {
  return dist(a.position, b.position);
}

function dist(p1: [number, number, number], p2: [number, number, number]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  const dz = p1[2] - p2[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
