import React from "react";
import { BackendPod } from "./BackendPod";
import { FrontendPod } from "./FrontendPod";
import { ArchitectureZone } from "./ArchitectureZone";
import { OperationsWall, OperationsTaskItem } from "./OperationsWall";
import { ArchitecturalPlanter, Whiteboard } from "../world/Props";

export interface EngineeringProps {
  onInspectWorkstation?: (id: string) => void;
  tasks?: OperationsTaskItem[];
  agents?: any[];
  pendingGatesCount?: number;
  onSelectTask?: (taskId: string) => void;
  onOpenTaskKanban?: () => void;
}

export const Engineering: React.FC<EngineeringProps> = ({
  onInspectWorkstation,
  tasks = [],
  agents = [],
  pendingGatesCount = 0,
  onSelectTask,
  onOpenTaskKanban
}) => {
  return (
    <group name="engineering-department-wing">
      {/* 1. Backend Core Pod */}
      <BackendPod
        onInspectWorkstation={onInspectWorkstation}
        tasks={tasks}
        agents={agents}
        pendingGatesCount={pendingGatesCount}
      />

      {/* 2. Frontend & UI Pod */}
      <FrontendPod
        onInspectWorkstation={onInspectWorkstation}
        tasks={tasks}
        agents={agents}
      />

      {/* 3. Architecture Zone */}
      <ArchitectureZone />

      {/* 4. Engineering Operations Wall (West Outer Wall) */}
      <OperationsWall
        position={[-21.5, 2.0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        tasks={tasks}
        onSelectTask={onSelectTask}
        onInspectWall={onOpenTaskKanban}
      />

      {/* 5. Natural Planters & Dividers */}
      <ArchitecturalPlanter position={[-17.8, 0, -6.5]} />
      <ArchitecturalPlanter position={[-17.8, 0, 4.5]} />
      <ArchitecturalPlanter position={[-8.5, 0, 3.5]} />

      {/* 6. Agile Sprint Whiteboard */}
      <Whiteboard
        position={[-18.5, 0, -0.5]}
        rotation={[0, Math.PI / 2, 0]}
        title="SPRINT 4 OBJECTIVES"
        notes={[
          "Reconcile agent Git worktrees with main",
          "Automate Playwright visual regressions",
          "Enforce OCC revision checks on meetings",
          "Human approval gates on schema changes"
        ]}
      />
    </group>
  );
};
