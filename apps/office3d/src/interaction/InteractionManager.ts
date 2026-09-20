import { InteractiveTarget, useOfficeStore } from "../state/officeStore";
import { ELEVATOR_POSITION } from "../navigation/ElevatorSystem";

export interface RegisteredInteractable {
  id: string;
  type: InteractiveTarget["type"];
  name: string;
  position: [number, number, number];
  promptText: string;
  floor: number;
  priority: number;
  metadata?: Record<string, any>;
}

export class InteractionManager {
  private static instance: InteractionManager;
  private interactables: Map<string, RegisteredInteractable> = new Map();

  private constructor() {
    this.registerStaticObjects();
  }

  public static getInstance(): InteractionManager {
    if (!InteractionManager.instance) {
      InteractionManager.instance = new InteractionManager();
    }
    return InteractionManager.instance;
  }

  public registerStaticObjects() {
    // 1. Elevator Access Points on Each Floor
    this.register({
      id: "elevator-0",
      type: "elevator",
      name: "Campus Elevator",
      position: [ELEVATOR_POSITION[0], 0, ELEVATOR_POSITION[2] + 1.2],
      promptText: "Use Elevator (Floor -1, 0, +1)",
      floor: 0,
      priority: 3
    });
    this.register({
      id: "elevator-1",
      type: "elevator",
      name: "Campus Elevator",
      position: [ELEVATOR_POSITION[0], 4.2, ELEVATOR_POSITION[2] + 1.2],
      promptText: "Use Elevator (Floor -1, 0, +1)",
      floor: 1,
      priority: 3
    });
    this.register({
      id: "elevator-neg1",
      type: "elevator",
      name: "Campus Elevator",
      position: [ELEVATOR_POSITION[0], -4.0, ELEVATOR_POSITION[2] + 1.2],
      promptText: "Use Elevator (Floor -1, 0, +1)",
      floor: -1,
      priority: 3
    });

    // 2. Meeting Room A (Level 0)
    this.register({
      id: "meeting-room-a",
      type: "meeting",
      name: "Conference Room A",
      position: [13.5, 0, 9.5],
      promptText: "Schedule / Start Architecture Meeting",
      floor: 0,
      priority: 4
    });

    // 3. Executive Boardroom (Level +1)
    this.register({
      id: "boardroom",
      type: "meeting",
      name: "Executive Boardroom",
      position: [12.5, 4.2, -6],
      promptText: "Convene Executive Board Review",
      floor: 1,
      priority: 4
    });

    // 4. Governance & Human Approval Console (Level 0)
    this.register({
      id: "governance-console",
      type: "governance",
      name: "Human Governance Console",
      position: [-13.5, 0, 7.5],
      promptText: "Review Pending Approval Gates",
      floor: 0,
      priority: 2
    });

    // 5. Engineering Operations Wall (Level 0)
    this.register({
      id: "operations-wall",
      type: "task-wall",
      name: "Engineering Operations Wall",
      position: [-20.0, 0, 0],
      promptText: "Inspect Task Kanban Board",
      floor: 0,
      priority: 2
    });

    // 6. Strategic Planning Table in Management (Level +1)
    this.register({
      id: "strategy-table-management",
      type: "manager-table",
      name: "AI Manager Strategy Rotunda",
      position: [0, 4.2, -10],
      promptText: "Open Strategic Planning Console",
      floor: 1,
      priority: 3
    });

    // 7. CEO Office Executive Console & Strategy Table (Level +1)
    this.register({
      id: "ceo-office-desk",
      type: "ceo-display",
      name: "CEO Executive Command Console",
      position: [-12.5, 4.2, -8.5],
      promptText: "Open Executive Command Console",
      floor: 1,
      priority: 2
    });
    this.register({
      id: "ceo-strategy-table",
      type: "ceo-display",
      name: "CEO Strategy & Organization Graph",
      position: [-12.5, 4.2, -4.5],
      promptText: "View Organization & Project Graph",
      floor: 1,
      priority: 2
    });

    // 8. Workstations in Engineering Pod
    this.register({
      id: "ws-alex",
      type: "workstation",
      name: "Alex Rivera",
      position: [-15.2, 0, -4.8],
      promptText: "Inspect Workstation · Alex Rivera",
      floor: 0,
      priority: 4,
      metadata: { agentId: "agent-alex", agentName: "Alex Rivera", role: "Senior Backend Lead" }
    });
    this.register({
      id: "ws-sarah",
      type: "workstation",
      name: "Sarah Chen",
      position: [-11.8, 0, -4.8],
      promptText: "Inspect Workstation · Sarah Chen",
      floor: 0,
      priority: 4,
      metadata: { agentId: "agent-sarah", agentName: "Sarah Chen", role: "Database & Cache Architect" }
    });
    this.register({
      id: "ws-rahul",
      type: "workstation",
      name: "Rahul Patel",
      position: [-15.2, 0, -3.2],
      promptText: "Inspect Workstation · Rahul Patel",
      floor: 0,
      priority: 4,
      metadata: { agentId: "agent-rahul", agentName: "Rahul Patel", role: "Distributed Systems Engineer" }
    });
    this.register({
      id: "ws-maya",
      type: "workstation",
      name: "Maya Lin",
      position: [-11.8, 0, -3.2],
      promptText: "Inspect Workstation · Maya Lin",
      floor: 0,
      priority: 4,
      metadata: { agentId: "agent-maya", agentName: "Maya Lin", role: "API & Protocols Engineer" }
    });
    this.register({
      id: "ws-elena",
      type: "workstation",
      name: "Elena Rostova",
      position: [-15.2, 0, 2.0],
      promptText: "Inspect Workstation · Elena Rostova",
      floor: 0,
      priority: 4,
      metadata: { agentId: "agent-elena", agentName: "Elena Rostova", role: "Frontend UI/UX Architect" }
    });
    this.register({
      id: "ws-liam",
      type: "workstation",
      name: "Liam O'Connor",
      position: [-11.8, 0, 2.0],
      promptText: "Inspect Workstation · Liam O'Connor",
      floor: 0,
      priority: 4,
      metadata: { agentId: "agent-liam", agentName: "Liam O'Connor", role: "Design Systems & QA" }
    });
  }

  public register(item: RegisteredInteractable) {
    this.interactables.set(item.id, item);
  }

  public unregister(id: string) {
    this.interactables.delete(id);
  }

  public updateAgents(agents: any[]) {
    // Dynamic registration of live agents for [E] Talk to <Name>
    agents.forEach((agent) => {
      const pos = agent.position || [-15.2, 0, -4.8];
      this.register({
        id: `agent-${agent.agentId}`,
        type: "agent",
        name: agent.name || "AI Engineer",
        position: pos,
        promptText: `Talk to ${agent.name || "Engineer"}`,
        floor: 0,
        priority: 1, // Highest priority
        metadata: { agentId: agent.agentId, ...agent }
      });
    });
  }

  public evaluateProximity(ceoPos: [number, number, number], ceoFloor: number) {
    const store = useOfficeStore.getState();
    const maxRadius = 3.0; // meters

    let bestTarget: InteractiveTarget | null = null;
    let bestDist = Infinity;
    let bestPriority = Infinity;

    this.interactables.forEach((item) => {
      // Check floor match or stairs transition
      if (Math.abs(item.floor - ceoFloor) > 0.5) return;

      const dx = item.position[0] - ceoPos[0];
      const dy = item.position[1] - ceoPos[1];
      const dz = item.position[2] - ceoPos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= maxRadius) {
        // Evaluate priority (lower number = higher priority)
        if (item.priority < bestPriority || (item.priority === bestPriority && dist < bestDist)) {
          bestPriority = item.priority;
          bestDist = dist;
          bestTarget = {
            id: item.id,
            type: item.type,
            name: item.name,
            position: item.position,
            promptText: item.promptText,
            distance: dist,
            metadata: item.metadata
          };
        }
      }
    });

    const currentActiveId = store.activeTarget ? store.activeTarget.id : null;
    const nextActiveId = bestTarget ? (bestTarget as InteractiveTarget).id : null;
    if (currentActiveId !== nextActiveId) {
      store.setActiveTarget(bestTarget);
    }
  }
}
