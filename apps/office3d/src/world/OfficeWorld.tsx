import React from "react";
import { Floor } from "./Floor";
import { Architecture } from "./Architecture";
import { Lighting } from "./Lighting";
import { Props } from "./Props";
import { EngineeringFloor } from "../departments/EngineeringFloor";
import { QALab } from "../departments/QALab";
import { DevOpsRoom } from "../departments/DevOpsRoom";
import { SecurityCenter } from "../departments/SecurityCenter";
import { ManagementFloor } from "../departments/ManagementFloor";

export interface OfficeWorldProps {
  onSelectDesk?: (deskId: string) => void;
  selectedDeskId?: string | null;
  onOpenPlanning?: () => void;
  onOpenQA?: () => void;
  onOpenDevOps?: () => void;
  onOpenSecurity?: () => void;
  activeGoal?: string;
  taskCount?: number;
  testPassCount?: number;
  testFailCount?: number;
}

export const OfficeWorld: React.FC<OfficeWorldProps> = ({
  onSelectDesk,
  selectedDeskId,
  onOpenPlanning,
  onOpenQA,
  onOpenDevOps,
  onOpenSecurity,
  activeGoal,
  taskCount,
  testPassCount,
  testFailCount
}) => {
  return (
    <group name="office-world-campus">
      {/* 1. Campus Environmental Lighting */}
      <Lighting />

      {/* 2. Zoned Multi-Material Flooring */}
      <Floor />

      {/* 3. Outer Walls, Glass Partitions, Structural Columns & Portals */}
      <Architecture />

      {/* 4. Architectural Office Props, Whiteboards & Coffee Bar */}
      <Props />

      {/* 5. Department Zones */}
      {/* Engineering Development Wing (West) */}
      <EngineeringFloor
        onSelectDesk={onSelectDesk}
        selectedDeskId={selectedDeskId}
      />

      {/* Executive / AI Manager Planning Suite (North) */}
      <ManagementFloor
        onOpenPlanning={onOpenPlanning}
        activeGoal={activeGoal}
        taskCount={taskCount}
      />

      {/* QA Testing Laboratory (East) */}
      <QALab
        onSelect={onOpenQA}
        testPassCount={testPassCount}
        testFailCount={testFailCount}
      />

      {/* DevOps / SRE Server Cluster (North-East) */}
      <DevOpsRoom
        onSelect={onOpenDevOps}
      />

      {/* Security Operations Center (South-West) */}
      <SecurityCenter
        onSelect={onOpenSecurity}
      />
    </group>
  );
};
