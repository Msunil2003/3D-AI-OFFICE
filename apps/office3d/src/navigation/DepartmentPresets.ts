export type DepartmentKey =
  | "overview"
  | "management"
  | "engineering"
  | "qa"
  | "devops"
  | "security"
  | "meeting";

export interface CameraPreset {
  name: string;
  cameraPosition: [number, number, number];
  targetPosition: [number, number, number];
  description: string;
}

export const DEPARTMENT_PRESETS: Record<DepartmentKey, CameraPreset> = {
  overview: {
    name: "Campus Overview",
    cameraPosition: [0, 18, 22],
    targetPosition: [0, 1, 0],
    description: "Cinematic overhead view of the full AI Software HQ"
  },
  management: {
    name: "Executive Suite",
    cameraPosition: [0, 5.2, -5.5],
    targetPosition: [0, 1.4, -10],
    description: "AI Manager & Strategic Planning Floor"
  },
  engineering: {
    name: "Engineering Wing",
    cameraPosition: [-11, 7, 7],
    targetPosition: [-11, 1.0, -1],
    description: "Software Architecture & Developer Workstations"
  },
  qa: {
    name: "QA Testing Lab",
    cameraPosition: [11, 6, 9],
    targetPosition: [11, 1.2, 4],
    description: "Automated Regression & Verification Lab"
  },
  devops: {
    name: "DevOps Server Room",
    cameraPosition: [11, 6, -3],
    targetPosition: [11, 1.4, -9],
    description: "Server Racks & CI/CD Pipeline Infrastructure"
  },
  security: {
    name: "Security Operations",
    cameraPosition: [-11, 4.5, 15],
    targetPosition: [-11, 1.2, 11],
    description: "Governance, Audit Logs & Cryptographic Integrity"
  },
  meeting: {
    name: "Conference Room",
    cameraPosition: [11, 4.5, 16.5],
    targetPosition: [11, 1.2, 12],
    description: "Glass Collaboration Atrium & Architecture Review"
  }
};
