import React, { useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AgentData } from "../hooks/useOfficeSocket";
import { Campus } from "../campus/Campus";
import { CEOCharacter } from "../characters/CEOCharacter";
import { AgentMovement } from "../characters/AgentMovement";
import { CameraController } from "../navigation/CameraController";
import { CEOController } from "../navigation/CEOController";
import { InteractionManager } from "../interaction/InteractionManager";
import { useOfficeStore } from "../state/officeStore";
import { OperationsTaskItem } from "../departments/OperationsWall";

export interface OfficeSceneProps {
  agents: AgentData[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  onDeselect: () => void;
  onOpenPlanning?: () => void;
  onOpenQA?: () => void;
  onOpenDevOps?: () => void;
  onOpenSecurity?: () => void;
  onOpenGovernance?: () => void;
  onStartMeeting?: () => void;
  onOpenTaskKanban?: () => void;
  onInspectWorkstation?: (id: string) => void;
  onOpenCeoConsole?: () => void;
  onOpenStrategyTable?: () => void;
  tasks?: OperationsTaskItem[];
  activeTask?: {
    id: string;
    title: string;
    status: string;
    risk?: string;
    blocked?: boolean;
  } | null;
  connected?: boolean;
  blockedCount?: number;
  pendingGatesCount?: number;
  testPassCount?: number;
  testFailCount?: number;
}

// Workstation home positions in Backend Pod
const AGENT_DESK_POSITIONS: [number, number, number][] = [
  [-15.2, 0, -4.8], // Alex (Workstation 1)
  [-11.8, 0, -4.8], // Sarah (Workstation 2)
  [-15.2, 0, -3.2], // Rahul (Workstation 3)
  [-11.8, 0, -3.2], // Maya (Workstation 4)
  [-15.2, 0, 2.0],  // Elena (Frontend 1)
  [-11.8, 0, 2.0]   // Liam (Frontend 2)
];

const SceneLoop: React.FC<OfficeSceneProps> = ({
  agents,
  selectedAgentId,
  onSelectAgent,
  onOpenPlanning,
  onOpenQA,
  onOpenDevOps,
  onOpenSecurity,
  onOpenGovernance,
  onStartMeeting,
  onOpenTaskKanban,
  onInspectWorkstation,
  onOpenCeoConsole,
  onOpenStrategyTable,
  tasks = [],
  activeTask,
  connected = true,
  blockedCount = 0,
  pendingGatesCount = 0,
  testPassCount = 104,
  testFailCount = 0
}) => {
  const ceoControllerRef = useRef<CEOController | null>(null);
  const interactionMgr = InteractionManager.getInstance();

  const ceo = useOfficeStore((state) => state.ceo);
  const activeMeeting = useOfficeStore((state) => state.activeMeeting);

  useEffect(() => {
    ceoControllerRef.current = new CEOController();
    return () => {
      ceoControllerRef.current?.destroy();
    };
  }, []);

  // Update live agents in interaction manager
  useEffect(() => {
    interactionMgr.updateAgents(
      agents.map((a, i) => ({
        ...a,
        position: AGENT_DESK_POSITIONS[i % AGENT_DESK_POSITIONS.length]
      }))
    );
  }, [agents]);

  // Main Simulation Loop
  useFrame((_, delta) => {
    // 1. Update CEO physics & keyboard movement
    ceoControllerRef.current?.update(delta);

    // 2. Evaluate proximity to interactive targets
    const currentCeo = useOfficeStore.getState().ceo;
    interactionMgr.evaluateProximity(currentCeo.position, currentCeo.floor);
  });

  return (
    <>
      {/* 1. Third-Person Follow Camera */}
      <CameraController />

      {/* 2. Full Multi-Floor Campus World & Architecture */}
      <Campus
        connected={connected}
        engineerCount={agents.length}
        taskCount={tasks.length}
        blockedCount={blockedCount}
        testPassCount={testPassCount}
        testFailCount={testFailCount}
        pendingGatesCount={pendingGatesCount}
        isMeetingActive={activeMeeting !== null}
        activeMeetingTopic={activeMeeting?.title}
        meetingParticipants={activeMeeting?.participants}
        tasks={tasks}
        agents={agents}
        onInspectWorkstation={onInspectWorkstation}
        onSelectTask={(id) => {
          const t = tasks.find((item) => item.id === id);
          if (t && t.assigneeName) {
            const agent = agents.find((a) => a.name?.toLowerCase().includes(t.assigneeName!.toLowerCase()));
            if (agent) onSelectAgent(agent.agentId);
          }
        }}
        onOpenTaskKanban={onOpenTaskKanban}
        onOpenPlanning={onOpenPlanning}
        onOpenQA={onOpenQA}
        onOpenDevOps={onOpenDevOps}
        onOpenSecurity={onOpenSecurity}
        onOpenGovernance={onOpenGovernance}
        onStartMeeting={onStartMeeting}
        onOpenCeoConsole={onOpenCeoConsole}
        onOpenStrategyTable={onOpenStrategyTable}
      />

      {/* 3. Founder / CEO Player Character */}
      <CEOCharacter
        position={ceo.position}
        rotationY={ceo.rotationY}
        isMoving={ceo.isMoving}
        isSprinting={ceo.isSprinting}
      />

      {/* 4. Autonomous AI Agents */}
      {agents.map((agent, index) => {
        const defaultDeskPos = AGENT_DESK_POSITIONS[index % AGENT_DESK_POSITIONS.length];
        const isSelected = agent.agentId === selectedAgentId;

        // If meeting is active and agent is participant, destination is conference room!
        const isInMeeting = activeMeeting && activeMeeting.participants.includes(agent.agentId);
        const destination = isInMeeting ? "meeting_a" : null;

        return (
          <AgentMovement
            key={agent.agentId}
            agent={agent}
            defaultPosition={defaultDeskPos}
            targetDestination={destination}
            isSelected={isSelected}
            onSelect={() => onSelectAgent(agent.agentId)}
            currentTaskTitle={activeTask?.title}
          />
        );
      })}
    </>
  );
};

export const OfficeScene: React.FC<OfficeSceneProps> = (props) => {
  return (
    <div className="canvas-container">
      <Canvas
        shadows
        camera={{ position: [0, 4, 18], fov: 48 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#050811"]} />
        <SceneLoop {...props} />
      </Canvas>
    </div>
  );
};
