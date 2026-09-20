import React from "react";
import { Floor } from "../world/Floor";
import { Architecture } from "../world/Architecture";
import { Ceiling } from "../world/Ceiling";
import { Windows } from "../world/Windows";
import { Lighting } from "../world/Lighting";
import { Props } from "../world/Props";
import { Atrium } from "./Atrium";
import { Reception } from "./Reception";
import { Exterior } from "./Exterior";
import { Engineering } from "../departments/Engineering";
import { QALab } from "../departments/QALab";
import { DevOpsControl } from "../departments/DevOpsControl";
import { ServerRoom } from "../departments/ServerRoom";
import { SecurityCenter } from "../departments/SecurityCenter";
import { Management } from "../departments/Management";
import { MeetingRoom } from "../rooms/MeetingRoom";
import { Boardroom } from "../rooms/Boardroom";
import { WarRoom } from "../rooms/WarRoom";
import { OneOnOneRoom } from "../rooms/OneOnOneRoom";
import { GovernanceRoom } from "../rooms/GovernanceRoom";
import { CEOOffice } from "../rooms/CEOOffice";
import { OperationsTaskItem } from "../departments/OperationsWall";

export interface CampusProps {
  connected?: boolean;
  engineerCount?: number;
  taskCount?: number;
  blockedCount?: number;
  testPassCount?: number;
  testFailCount?: number;
  pendingGatesCount?: number;
  isMeetingActive?: boolean;
  activeMeetingTopic?: string;
  meetingParticipants?: string[];
  tasks?: OperationsTaskItem[];
  agents?: any[];
  onInspectWorkstation?: (id: string) => void;
  onSelectTask?: (taskId: string) => void;
  onOpenTaskKanban?: () => void;
  onOpenPlanning?: () => void;
  onOpenQA?: () => void;
  onOpenDevOps?: () => void;
  onOpenSecurity?: () => void;
  onOpenGovernance?: () => void;
  onStartMeeting?: () => void;
  onOpenCeoConsole?: () => void;
  onOpenStrategyTable?: () => void;
}

export const Campus: React.FC<CampusProps> = ({
  connected = true,
  engineerCount = 2,
  taskCount = 4,
  blockedCount = 0,
  testPassCount = 104,
  testFailCount = 0,
  pendingGatesCount = 0,
  isMeetingActive = false,
  activeMeetingTopic = "Architecture Alignment & Sprint Review",
  meetingParticipants = [],
  tasks = [],
  agents = [],
  onInspectWorkstation,
  onSelectTask,
  onOpenTaskKanban,
  onOpenPlanning,
  onOpenQA,
  onOpenDevOps,
  onOpenSecurity,
  onOpenGovernance,
  onStartMeeting,
  onOpenCeoConsole,
  onOpenStrategyTable
}) => {
  return (
    <group name="aioffice-full-campus-world">
      {/* 1. LAYERED LIGHTING (Ambient, directional, department lights) */}
      <Lighting />

      {/* 2. EXTERIOR ENVIRONMENT (Landscape plaza, courtyards, trees, skyline) */}
      <Exterior />

      {/* 3. MULTI-LEVEL FLOOR SLABS & CARPET/STONE ZONES (-1, 0, +1) */}
      <Floor />

      {/* 4. PERIMETER GLASS CURTAIN WALLS & WINDOWS */}
      <Windows />

      {/* 5. MULTI-FLOOR ARCHITECTURE (Columns, Stairs, Elevator Tower, Portals) */}
      <Architecture />

      {/* 6. ACOUSTIC CEILINGS, TRUSSES & CENTRAL SKYLIGHT */}
      <Ceiling />

      {/* 7. ARCHITECTURAL PROPS & DECOR */}
      <Props />

      {/* 8. LEVEL 0: RECEPTION & SOUTH ENTRANCE */}
      <Reception
        connected={connected}
        engineerCount={engineerCount}
        taskCount={taskCount}
      />

      {/* 9. LEVEL 0: CENTRAL ATRIUM ROTUNDA & EMBLEM */}
      <Atrium />

      {/* 10. LEVEL 0: ENGINEERING WING (WEST) */}
      <Engineering
        onInspectWorkstation={onInspectWorkstation}
        tasks={tasks}
        agents={agents}
        pendingGatesCount={pendingGatesCount}
        onSelectTask={onSelectTask}
        onOpenTaskKanban={onOpenTaskKanban}
      />

      {/* 11. LEVEL 0: QA AUTOMATED TESTING LAB (EAST) */}
      <QALab
        onSelect={onOpenQA}
        onInspectWorkstation={onInspectWorkstation}
        testPassCount={testPassCount}
        testFailCount={testFailCount}
      />

      {/* 12. LEVEL 0: DEVOPS CONTROL ROOM (NORTH-EAST) */}
      <DevOpsControl
        onSelect={onOpenDevOps}
        onInspectWorkstation={onInspectWorkstation}
      />

      {/* 13. LEVEL -1: INFRASTRUCTURE & SERVER VAULT */}
      <ServerRoom />

      {/* 14. LEVEL 0: SECURITY OPERATIONS CENTER (SOUTH-WEST) */}
      <SecurityCenter
        onSelect={onOpenSecurity}
        onInspectWorkstation={onInspectWorkstation}
      />

      {/* 15. LEVEL 0: GOVERNANCE & APPROVAL CENTER */}
      <GovernanceRoom
        pendingGatesCount={pendingGatesCount}
        onOpenGovernance={onOpenGovernance}
      />

      {/* 16. LEVEL 0: CONFERENCE ROOM A */}
      <MeetingRoom
        id="meeting-a"
        name="Conference Room A"
        position={[13.5, 0, 13]}
        isActive={isMeetingActive}
        meetingTopic={activeMeetingTopic}
        participants={meetingParticipants}
        onStartMeeting={onStartMeeting}
      />

      {/* 17. LEVEL 0: 1:1 DISCUSSION BOOTH */}
      <OneOnOneRoom />

      {/* 18. LEVEL 0: INCIDENT WAR ROOM (NORTH WALL) */}
      <WarRoom
        isIncidentActive={blockedCount > 0}
        incidentTitle={blockedCount > 0 ? "TASK BLOCKED • DEPENDENCY RECOVERY ACTIVE" : "SYSTEM HEALTHY • STANDBY"}
      />

      {/* 19. LEVEL +1: FOUNDER & CEO PRIVATE OFFICE */}
      <CEOOffice
        onOpenConsole={onOpenCeoConsole}
        onOpenStrategyTable={onOpenStrategyTable}
      />

      {/* 20. LEVEL +1: AI MANAGER & STRATEGIC PLANNING */}
      <Management
        onOpenPlanning={onOpenPlanning}
        onInspectWorkstation={onInspectWorkstation}
        taskCount={taskCount}
      />

      {/* 21. LEVEL +1: EXECUTIVE BOARDROOM */}
      <Boardroom
        isActive={isMeetingActive}
        onStartMeeting={onStartMeeting}
      />
    </group>
  );
};
