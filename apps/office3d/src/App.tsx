import React, { useState, useEffect, useMemo } from "react";
import { HelpCircle } from "lucide-react";
import { useOfficeSocket, AgentData } from "./hooks/useOfficeSocket";
import { OfficeScene } from "./components/OfficeScene";
import { CommandHUD } from "./ui/CommandHUD";
import { EventFeed, EventItem } from "./ui/EventFeed";
import { InteractionPrompt } from "./interaction/InteractionPrompt";
import { AgentInspector } from "./ui/AgentInspector";
import { TaskInspector } from "./ui/TaskInspector";
import { MeetingPanel } from "./ui/MeetingPanel";
import { WorldMap } from "./ui/WorldMap";
import { ElevatorModal } from "./ui/ElevatorModal";
import { CEOConsoleModal } from "./ui/CEOConsoleModal";
import { NotificationCenter } from "./ui/NotificationCenter";
import { SearchPalette } from "./ui/SearchPalette";
import { AttentionCenter } from "./ui/AttentionCenter";
import { SpawnModal } from "./components/SpawnModal";
import { TaskKanban, DomainTask } from "./components/TaskKanban";
import { ApprovalModal } from "./components/ApprovalModal";
import { PlanningDashboard } from "./components/PlanningDashboard";
import { useOfficeStore } from "./state/officeStore";

if (typeof window !== "undefined") {
  (window as any).__officeStore = useOfficeStore;
}

const CANONICAL_AGENTS: AgentData[] = [
  {
    agentId: "agent-alex",
    name: "Alex Rivera",
    status: "working",
    summary: "Senior Backend Lead · Refactoring authentication & rate limiter",
    provider: "claude-code",
    messages: []
  },
  {
    agentId: "agent-sarah",
    name: "Sarah Chen",
    status: "working",
    summary: "Database & Cache Architect · Connection pooling & indexes",
    provider: "claude-code",
    messages: []
  },
  {
    agentId: "agent-rahul",
    name: "Rahul Patel",
    status: "idle",
    summary: "Distributed Systems Engineer · Event stream pipelines",
    provider: "github-copilot",
    messages: []
  },
  {
    agentId: "agent-maya",
    name: "Maya Lin",
    status: "working",
    summary: "API & Protocols Engineer · REST and WebSocket gateways",
    provider: "claude-code",
    messages: []
  },
  {
    agentId: "agent-elena",
    name: "Elena Rostova",
    status: "working",
    summary: "Frontend & UI/UX Architect · Spatial OS interface",
    provider: "claude-code",
    messages: []
  },
  {
    agentId: "agent-liam",
    name: "Liam O'Connor",
    status: "idle",
    summary: "Design Systems & QA · Component libraries and regression",
    provider: "github-copilot",
    messages: []
  }
];

export const App: React.FC = () => {
  const {
    connected,
    agents,
    recentEvents,
    sendChatMessage,
    spawnAgent,
    resetAgent,
    abortAgent,
    deleteAgent,
    getDiff
  } = useOfficeSocket();

  const activeModal = useOfficeStore((state) => state.activeModal);
  const setActiveModal = useOfficeStore((state) => state.setActiveModal);
  const closeAllModals = useOfficeStore((state) => state.closeAllModals);
  const selectedAgentId = useOfficeStore((state) => state.selectedAgentId);
  const setSelectedAgentId = useOfficeStore((state) => state.setSelectedAgentId);
  const selectedWorkstationId = useOfficeStore((state) => state.selectedWorkstationId);
  const addNotification = useOfficeStore((state) => state.addNotification);
  const focusMode = useOfficeStore((state) => state.focusMode);

  const [domainTasks, setDomainTasks] = useState<DomainTask[]>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [showControlsHelp, setShowControlsHelp] = useState(false);

  // Derive effective agents merging live agents with canonical workstation leads
  const effectiveAgents = useMemo(() => {
    if (agents && agents.length > 0) {
      const liveIds = new Set(agents.map((a) => a.agentId));
      const complement = CANONICAL_AGENTS.filter((ca) => !liveIds.has(ca.agentId));
      return [...agents, ...complement];
    }
    return CANONICAL_AGENTS;
  }, [agents]);

  // Poll backend for real tasks and approval gates
  const refreshBackendState = async () => {
    try {
      // 1. Approvals
      const apprRes = await fetch("http://localhost:3003/api/approvals?status=PENDING");
      if (apprRes.ok) {
        const data = await apprRes.json();
        const count = data.approvals?.length || 0;
        if (count > pendingApprovalsCount && pendingApprovalsCount > 0) {
          addNotification({
            type: "warning",
            title: "GOVERNANCE GATE REQUIRED",
            message: "A new pull request requires executive review and merge authorization.",
            actionLabel: "Review Gate",
            targetPosition: [-13.5, 0, 7.5],
            targetFloor: 0,
            onAction: () => setActiveModal("governance-gate")
          });
        }
        setPendingApprovalsCount(count);
      }

      // 2. Tasks
      const taskRes = await fetch("http://localhost:3003/api/tasks");
      if (taskRes.ok) {
        const data = await taskRes.json();
        setDomainTasks(data.tasks || []);
      }
    } catch {
      // Backend startup
    }
  };

  useEffect(() => {
    refreshBackendState();
    const interval = setInterval(refreshBackendState, 4000);
    return () => clearInterval(interval);
  }, [pendingApprovalsCount]);

  // Telemetry metrics
  const blockedCount = useMemo(() => domainTasks.filter((t) => t.blocked).length, [domainTasks]);

  const activeTask = useMemo(() => {
    const candidate = domainTasks.find((t) => t.blocked || t.status === "IN_PROGRESS" || t.status === "TESTING" || t.status === "ASSIGNED");
    return candidate || domainTasks[0] || null;
  }, [domainTasks]);

  const selectedAgent = useMemo(() => {
    if (selectedAgentId) {
      const found = effectiveAgents.find((a) => a.agentId === selectedAgentId);
      if (found) return found;
    }
    return effectiveAgents[0] || null;
  }, [effectiveAgents, selectedAgentId]);

  // Live WebSocket event items
  const feedEvents: EventItem[] = useMemo(() => {
    if (!recentEvents || recentEvents.length === 0) return [];
    return recentEvents.map((e, idx) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      let text = "System event recorded";
      let type: EventItem["type"] = "info";

      if (e.type === "agent.status") {
        text = `Agent status transition: ${e.payload?.status || "updated"}`;
        type = e.payload?.status === "error" ? "error" : "info";
      } else if (e.type === "agent.message") {
        text = `Agent output: ${e.payload?.text?.slice(0, 45) || "message"}`;
      } else if (e.type === "task.completed") {
        text = `Task verified & merged: ${e.payload?.taskId || ""}`;
        type = "success";
      } else if (e.type === "task.blocked") {
        text = `Task blocked: ${e.payload?.reason || "failure"}`;
        type = "error";
      }

      return {
        id: `ev-${idx}-${e.timestamp || Date.now()}`,
        time: timeStr,
        text,
        type
      };
    });
  }, [recentEvents]);

  // Global window handles for test automation
  useEffect(() => {
    (window as any).__agents = agents;
    (window as any).__store = useOfficeStore;
    (window as any).__selectAgent = (id?: string) => {
      setSelectedAgentId(id || agents[0]?.agentId || null);
      setActiveModal("agent-talk");
    };
  }, [agents, setActiveModal, setSelectedAgentId]);

  return (
    <>
      {/* 1. Executive Operating Bar (Top Navigation & Telemetry) */}
      <CommandHUD
        connected={connected}
        engineerCount={agents.length}
        taskCount={domainTasks.length}
        blockedCount={blockedCount}
        pendingGatesCount={pendingApprovalsCount}
        onOpenPlanning={() => setActiveModal("planning-dashboard")}
        onOpenKanban={() => setActiveModal("task-kanban")}
        onOpenApprovals={() => setActiveModal("governance-gate")}
        onOpenSpawn={() => setActiveModal("agent-talk")}
        onOpenMap={() => setActiveModal("campus-map")}
        onOpenMeeting={() => setActiveModal("meeting-scheduler")}
      />

      {/* 2. 3D Virtual Software Organization World */}
      <OfficeScene
        agents={effectiveAgents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={(id) => {
          setSelectedAgentId(id);
          setActiveModal("agent-talk");
        }}
        onDeselect={() => {
          setSelectedAgentId(null);
          closeAllModals();
        }}
        onOpenPlanning={() => setActiveModal("planning-dashboard")}
        onOpenQA={() => setActiveModal("task-kanban")}
        onOpenDevOps={() => {
          addNotification({
            type: "info",
            title: "DevOps Operations",
            message: "CI/CD automated pipeline running. Server vault on Level -1 active."
          });
        }}
        onOpenSecurity={() => setActiveModal("governance-gate")}
        onOpenGovernance={() => setActiveModal("governance-gate")}
        onStartMeeting={() => setActiveModal("meeting-scheduler")}
        onOpenTaskKanban={() => setActiveModal("task-kanban")}
        onInspectWorkstation={(wsId) => {
          setActiveModal("workstation-inspect");
        }}
        onOpenCeoConsole={() => setActiveModal("ceo-console")}
        onOpenStrategyTable={() => setActiveModal("ceo-console")}
        tasks={domainTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assigneeName: t.assigneeId,
          blocked: t.blocked
        }))}
        activeTask={activeTask}
        connected={connected}
        blockedCount={blockedCount}
        pendingGatesCount={pendingApprovalsCount}
      />

      {/* 3. Proximity Contextual Interaction Indicator [E] (Bottom Screen) */}
      <InteractionPrompt />

      {/* 4. Real-time Activity Feed (Bottom-Left) */}
      <EventFeed events={feedEvents} />

      {/* 5. Executive Notifications / Toasts Stack (Top-Right) */}
      <NotificationCenter />

      {/* 6. Command Palette (Ctrl+K) */}
      <SearchPalette agents={effectiveAgents} tasks={domainTasks} />

      {/* 7. Attention Center Panel */}
      <AttentionCenter />

      {/* 8. Controls & Navigation Help Popover */}
      <div className={`controls-help-wrapper ${focusMode ? "focus-hidden" : ""}`}>
        <button
          className="controls-toggle-btn"
          onClick={() => setShowControlsHelp(!showControlsHelp)}
          title="Controls Reference (TAB toggles focus mode)"
        >
          <HelpCircle size={14} color="var(--accent-info)" />
          <span>Controls</span>
        </button>
        {showControlsHelp && (
          <div className="controls-popover">
            <div className="controls-popover-title">Movement & Navigation</div>
            <div className="control-row">
              <span className="control-desc">Walk / Move</span>
              <span className="key-badge">W A S D</span>
            </div>
            <div className="control-row">
              <span className="control-desc">Sprint</span>
              <span className="key-badge">Shift</span>
            </div>
            <div className="control-row">
              <span className="control-desc">Interact</span>
              <span className="key-badge">E</span>
            </div>
            <div className="control-row">
              <span className="control-desc">Command Palette</span>
              <span className="key-badge">Ctrl+K</span>
            </div>
            <div className="control-row">
              <span className="control-desc">Immersive Mode</span>
              <span className="key-badge">Tab</span>
            </div>
            <div className="control-row">
              <span className="control-desc">Orbit / Look</span>
              <span className="key-badge">Drag</span>
            </div>
            <div className="control-row">
              <span className="control-desc">Zoom</span>
              <span className="key-badge">Scroll</span>
            </div>
            <div className="control-row">
              <span className="control-desc">Close / Back</span>
              <span className="key-badge">ESC</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 9. CONTEXTUAL OVERLAYS & MODALS                           */}
      {/* ========================================================= */}
      {/* Agent Inspector (Talk & Instructions) */}
      {activeModal === "agent-talk" && selectedAgent && (
        <AgentInspector
          agent={selectedAgent}
          onClose={closeAllModals}
          onSendMessage={sendChatMessage}
          onInspectWork={() => setActiveModal("workstation-inspect")}
          onViewDiff={() => setActiveModal("workstation-inspect")}
          onViewTerminal={() => setActiveModal("workstation-inspect")}
          onCallToMeeting={() => setActiveModal("meeting-scheduler")}
          currentTaskTitle={activeTask?.title}
        />
      )}

      {/* Workstation Inspector (Diff, Workspace, Terminal) */}
      {activeModal === "workstation-inspect" && (
        <TaskInspector
          workstationId={selectedWorkstationId || selectedAgent?.agentId || "ws-default"}
          agentName={selectedAgent?.name || "Unassigned"}
          agentRole={(selectedAgent as any)?.role || selectedAgent?.summary || "Software Engineer"}
          taskId={activeTask?.id || ""}
          taskTitle={activeTask?.title || "No active task selected"}
          onClose={closeAllModals}
          onTalkToAgent={() => setActiveModal("agent-talk")}
          getDiff={getDiff}
        />
      )}

      {/* Meeting Panel (Convene & Start Conferences) */}
      <MeetingPanel
        isOpen={activeModal === "meeting-scheduler"}
        onClose={closeAllModals}
        agents={effectiveAgents}
      />

      {/* Campus World Map Blueprint */}
      <WorldMap
        isOpen={activeModal === "campus-map"}
        onClose={closeAllModals}
      />

      {/* Elevator Multi-Floor Transit */}
      <ElevatorModal
        isOpen={activeModal === "elevator-select"}
        onClose={closeAllModals}
      />

      {/* CEO Executive Command Console */}
      <CEOConsoleModal
        isOpen={activeModal === "ceo-console"}
        onClose={closeAllModals}
        engineerCount={effectiveAgents.length}
        taskCount={domainTasks.length}
        blockedCount={blockedCount}
        pendingGatesCount={pendingApprovalsCount}
        tasks={domainTasks}
      />

      {/* Task Operations Kanban Board */}
      <TaskKanban
        isOpen={activeModal === "task-kanban"}
        onClose={closeAllModals}
        onInspectTask={(task) => {
          if (task.assigneeId) {
            setSelectedAgentId(task.assigneeId);
            setActiveModal("agent-talk");
          }
        }}
      />

      {/* Executive Governance Approval Console */}
      <ApprovalModal
        isOpen={activeModal === "governance-gate"}
        onClose={closeAllModals}
        onActionComplete={() => {
          refreshBackendState();
        }}
      />

      {/* Strategic Planning Dashboard */}
      <PlanningDashboard
        isOpen={activeModal === "planning-dashboard"}
        onClose={closeAllModals}
        onPlanApproved={() => {
          refreshBackendState();
        }}
      />
    </>
  );
};
