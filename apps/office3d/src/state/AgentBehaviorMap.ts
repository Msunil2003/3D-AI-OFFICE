export type AgentVisualState =
  | "IDLE"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "TESTING"
  | "READY_FOR_REVIEW"
  | "IN_REVIEW"
  | "APPROVAL"
  | "BLOCKED"
  | "RECOVERY_REQUIRED"
  | "MEETING"
  | "COLLABORATING"
  | "DONE";

export interface AgentVisualBehavior {
  state: AgentVisualState;
  color: string;
  glowColor: string;
  animation: "idle" | "typing" | "thinking" | "walking" | "frustrated" | "meeting" | "celebrating";
  label: string;
  description: string;
}

export const AGENT_BEHAVIOR_MAP: Record<string, AgentVisualBehavior> = {
  idle: {
    state: "IDLE",
    color: "#94a3b8",
    glowColor: "#64748b",
    animation: "idle",
    label: "Available",
    description: "Ready for task assignment"
  },
  available: {
    state: "IDLE",
    color: "#10b981",
    glowColor: "#059669",
    animation: "idle",
    label: "Available",
    description: "Ready for task assignment"
  },
  replied: {
    state: "IN_PROGRESS",
    color: "#38bdf8",
    glowColor: "#0284c7",
    animation: "typing",
    label: "Active / Responding",
    description: "Processing task prompt and generating code"
  },
  active: {
    state: "IN_PROGRESS",
    color: "#38bdf8",
    glowColor: "#0284c7",
    animation: "typing",
    label: "Active / Coding",
    description: "Writing code in isolated Git worktree"
  },
  working: {
    state: "IN_PROGRESS",
    color: "#38bdf8",
    glowColor: "#0284c7",
    animation: "typing",
    label: "Active / Coding",
    description: "Writing code in isolated Git worktree"
  },
  IN_PROGRESS: {
    state: "IN_PROGRESS",
    color: "#38bdf8",
    glowColor: "#0284c7",
    animation: "typing",
    label: "Active / Coding",
    description: "Writing code in isolated Git worktree"
  },
  thinking: {
    state: "IN_PROGRESS",
    color: "#f59e0b",
    glowColor: "#d97706",
    animation: "thinking",
    label: "Analyzing",
    description: "Processing prompt and planning architecture"
  },
  TESTING: {
    state: "TESTING",
    color: "#10b981",
    glowColor: "#047857",
    animation: "typing",
    label: "Running Tests",
    description: "Executing automated test suites"
  },
  READY_FOR_REVIEW: {
    state: "READY_FOR_REVIEW",
    color: "#f59e0b",
    glowColor: "#b45309",
    animation: "idle",
    label: "Ready for Review",
    description: "Task complete, awaiting architectural review"
  },
  IN_REVIEW: {
    state: "IN_REVIEW",
    color: "#a855f7",
    glowColor: "#7e22ce",
    animation: "thinking",
    label: "Under Review",
    description: "Peer and automated review in progress"
  },
  APPROVAL: {
    state: "APPROVAL",
    color: "#fbbf24",
    glowColor: "#d97706",
    animation: "thinking",
    label: "Approval Gate",
    description: "Awaiting human merge authorization"
  },
  blocked: {
    state: "BLOCKED",
    color: "#ef4444",
    glowColor: "#b91c1c",
    animation: "frustrated",
    label: "Blocked / Error",
    description: "Blocked condition detected, diagnostic required"
  },
  error: {
    state: "BLOCKED",
    color: "#ef4444",
    glowColor: "#b91c1c",
    animation: "frustrated",
    label: "Blocked / Error",
    description: "Runtime error encountered"
  },
  RECOVERY_REQUIRED: {
    state: "RECOVERY_REQUIRED",
    color: "#dc2626",
    glowColor: "#991b1b",
    animation: "frustrated",
    label: "Recovery Required",
    description: "Worktree or session recovery initiated"
  },
  meeting: {
    state: "MEETING",
    color: "#818cf8",
    glowColor: "#4f46e5",
    animation: "meeting",
    label: "In Meeting",
    description: "Participating in architectural conference"
  },
  collaborating: {
    state: "COLLABORATING",
    color: "#c084fc",
    glowColor: "#9333ea",
    animation: "thinking",
    label: "Collaborating",
    description: "Exchanging information with peer agent"
  },
  done: {
    state: "DONE",
    color: "#10b981",
    glowColor: "#059669",
    animation: "celebrating",
    label: "Completed",
    description: "Task successfully merged and verified"
  }
};

export function getAgentVisualBehavior(status?: string): AgentVisualBehavior {
  if (!status) return AGENT_BEHAVIOR_MAP.idle;
  return AGENT_BEHAVIOR_MAP[status] || AGENT_BEHAVIOR_MAP.idle;
}
