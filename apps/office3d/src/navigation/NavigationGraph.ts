export interface Waypoint {
  id: string;
  name: string;
  floor: number;
  position: [number, number, number];
  neighbors: string[];
}

export const CAMPUS_WAYPOINTS: Record<string, Waypoint> = {
  // LEVEL 0: OPERATIONS
  reception: {
    id: "reception",
    name: "Reception & Entrance",
    floor: 0,
    position: [0, 0, 13],
    neighbors: ["atrium", "hallway_south"]
  },
  atrium: {
    id: "atrium",
    name: "Central Atrium",
    floor: 0,
    position: [0, 0, 0],
    neighbors: ["reception", "hallway_north", "hallway_south", "hallway_west", "hallway_east", "stairs_bottom", "elevator_0"]
  },
  hallway_north: {
    id: "hallway_north",
    name: "North Spine",
    floor: 0,
    position: [0, 0, -5],
    neighbors: ["atrium", "war_room", "elevator_0"]
  },
  hallway_south: {
    id: "hallway_south",
    name: "South Spine",
    floor: 0,
    position: [0, 0, 8],
    neighbors: ["atrium", "reception", "meeting_a", "security"]
  },
  hallway_west: {
    id: "hallway_west",
    name: "West Engineering Concourse",
    floor: 0,
    position: [-6, 0, 0],
    neighbors: ["atrium", "backend_pod", "frontend_pod", "security", "stairs_bottom"]
  },
  hallway_east: {
    id: "hallway_east",
    name: "East Technical Concourse",
    floor: 0,
    position: [6, 0, 0],
    neighbors: ["atrium", "qa_lab", "devops", "meeting_a", "elevator_0"]
  },

  // Department Targets (Level 0)
  backend_pod: {
    id: "backend_pod",
    name: "Backend Core Pod",
    floor: 0,
    position: [-13.5, 0, -4],
    neighbors: ["hallway_west"]
  },
  frontend_pod: {
    id: "frontend_pod",
    name: "Frontend & UI Pod",
    floor: 0,
    position: [-13.5, 0, 2],
    neighbors: ["hallway_west"]
  },
  qa_lab: {
    id: "qa_lab",
    name: "QA Verification Lab",
    floor: 0,
    position: [12.5, 0, 5],
    neighbors: ["hallway_east"]
  },
  devops: {
    id: "devops",
    name: "DevOps Control Room",
    floor: 0,
    position: [12.5, 0, -9],
    neighbors: ["hallway_east"]
  },
  security: {
    id: "security",
    name: "Security Operations",
    floor: 0,
    position: [-12.5, 0, 12],
    neighbors: ["hallway_west", "hallway_south"]
  },
  meeting_a: {
    id: "meeting_a",
    name: "Conference Room A",
    floor: 0,
    position: [13.5, 0, 13],
    neighbors: ["hallway_east", "hallway_south"]
  },
  war_room: {
    id: "war_room",
    name: "Incident War Room",
    floor: 0,
    position: [0, 0, -10],
    neighbors: ["hallway_north"]
  },

  // Vertical Circulation Nodes (Level 0)
  elevator_0: {
    id: "elevator_0",
    name: "Elevator (Level 0)",
    floor: 0,
    position: [4.2, 0, -1.0],
    neighbors: ["atrium", "hallway_east", "elevator_neg1", "elevator_pos1"]
  },
  stairs_bottom: {
    id: "stairs_bottom",
    name: "Grand Stairs Base",
    floor: 0,
    position: [-3.8, 0, 3.5],
    neighbors: ["atrium", "hallway_west", "stairs_top"]
  },

  // LEVEL +1: LEADERSHIP
  stairs_top: {
    id: "stairs_top",
    name: "Grand Stairs Landing (Level +1)",
    floor: 1,
    position: [-3.8, 4.2, -2.5],
    neighbors: ["stairs_bottom", "mezzanine_promenade", "ceo_office"]
  },
  elevator_pos1: {
    id: "elevator_pos1",
    name: "Elevator (Level +1)",
    floor: 1,
    position: [4.2, 4.2, -1.0],
    neighbors: ["elevator_0", "mezzanine_promenade", "boardroom"]
  },
  mezzanine_promenade: {
    id: "mezzanine_promenade",
    name: "Mezzanine Walkway",
    floor: 1,
    position: [0, 4.2, -4],
    neighbors: ["stairs_top", "elevator_pos1", "ceo_office", "management", "boardroom"]
  },
  ceo_office: {
    id: "ceo_office",
    name: "Founder & CEO Private Office",
    floor: 1,
    position: [-12.5, 4.2, -6],
    neighbors: ["mezzanine_promenade", "stairs_top"]
  },
  management: {
    id: "management",
    name: "AI Engineering Command Center",
    floor: 1,
    position: [0, 4.2, -10],
    neighbors: ["mezzanine_promenade"]
  },
  boardroom: {
    id: "boardroom",
    name: "Executive Boardroom",
    floor: 1,
    position: [12.5, 4.2, -6],
    neighbors: ["mezzanine_promenade", "elevator_pos1"]
  },

  // LEVEL -1: INFRASTRUCTURE
  elevator_neg1: {
    id: "elevator_neg1",
    name: "Elevator (Level -1)",
    floor: -1,
    position: [4.2, -4.0, -1.0],
    neighbors: ["elevator_0", "server_room"]
  },
  server_room: {
    id: "server_room",
    name: "Infrastructure Server Vault",
    floor: -1,
    position: [0, -4.0, -4],
    neighbors: ["elevator_neg1"]
  }
};

export function getDepartmentLocation(status?: string, defaultDeskPos: [number, number, number] = [-15.2, 0, -4.8]): [number, number, number] {
  if (!status) return defaultDeskPos;
  switch (status) {
    case "TESTING":
      return CAMPUS_WAYPOINTS.qa_lab.position;
    case "MEETING":
    case "meeting":
      return CAMPUS_WAYPOINTS.meeting_a.position;
    case "collaborating":
    case "COLLABORATING":
      return CAMPUS_WAYPOINTS.atrium.position;
    case "BLOCKED":
    case "error":
      return defaultDeskPos;
    default:
      return defaultDeskPos;
  }
}
