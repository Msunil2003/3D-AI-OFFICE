import React from "react";
import { Workstation3D } from "../components/Workstation3D";
import { Text } from "@react-three/drei";

export interface BackendPodProps {
  onInspectWorkstation?: (id: string) => void;
  activeTaskId?: string;
  activeTaskTitle?: string;
  tasks?: any[];
  agents?: any[];
  pendingGatesCount?: number;
}

export const BackendPod: React.FC<BackendPodProps> = ({
  onInspectWorkstation,
  activeTaskTitle = "Authentication Middleware & Rate Limiter",
  tasks = [],
  agents = [],
  pendingGatesCount = 0
}) => {
  const alexTask = tasks.find((t: any) =>
    (t.assigneeId && t.assigneeId.toLowerCase().includes("alex")) ||
    (t.assigneeName && t.assigneeName.toLowerCase().includes("alex"))
  ) || tasks[0];

  const sarahTask = tasks.find((t: any) =>
    (t.assigneeId && t.assigneeId.toLowerCase().includes("sarah")) ||
    (t.assigneeName && t.assigneeName.toLowerCase().includes("sarah"))
  );

  const rahulTask = tasks.find((t: any) =>
    (t.assigneeId && t.assigneeId.toLowerCase().includes("rahul")) ||
    (t.assigneeName && t.assigneeName.toLowerCase().includes("rahul"))
  );

  const mayaTask = tasks.find((t: any) =>
    (t.assigneeId && t.assigneeId.toLowerCase().includes("maya")) ||
    (t.assigneeName && t.assigneeName.toLowerCase().includes("maya"))
  );

  const alexAgent = agents.find((a: any) => a.name?.toLowerCase().includes("alex") || a.agentId?.toLowerCase().includes("alex")) || agents[0];
  const sarahAgent = agents.find((a: any) => a.name?.toLowerCase().includes("sarah") || a.agentId?.toLowerCase().includes("sarah"));
  const rahulAgent = agents.find((a: any) => a.name?.toLowerCase().includes("rahul") || a.agentId?.toLowerCase().includes("rahul"));
  const mayaAgent = agents.find((a: any) => a.name?.toLowerCase().includes("maya") || a.agentId?.toLowerCase().includes("maya"));

  return (
    <group name="engineering-backend-pod">
      {/* Pod Overhead Signage */}
      <group position={[-13.5, 2.8, -4]}>
        <mesh>
          <boxGeometry args={[3.2, 0.32, 0.05]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
        </mesh>
        <Text position={[0, 0, 0.03]} fontSize={0.12} color="#38bdf8" anchorX="center" anchorY="middle" fontWeight="bold">
          BACKEND CORE POD
        </Text>
      </group>

      {/* Acoustic Privacy Screen Divider between desk rows */}
      <mesh position={[-13.5, 0.9, -4]} receiveShadow>
        <boxGeometry args={[6.8, 1.2, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* 4 Workstations in Face-to-Face Collaborative Pod Formation */}
      {/* Workstation 1: Alex (Senior Backend Engineer - 2 Monitors) */}
      <Workstation3D
        id="ws-alex"
        name="Alex Dev • Senior Backend"
        role="Senior Backend Engineer"
        position={[-15.2, 0, -4.8]}
        rotation={[0, 0, 0]}
        monitorCount={2}
        taskTitle={alexTask?.title || activeTaskTitle}
        taskStatus={alexTask?.blocked ? "BLOCKED" : alexTask?.status || "IN_PROGRESS"}
        isBlocked={alexTask?.blocked}
        blockReason={alexTask?.blockReason}
        hasPendingApproval={pendingGatesCount > 0}
        agentStatus={alexAgent?.status || "working"}
        screenContent="code"
        onInspect={() => onInspectWorkstation?.("ws-alex")}
      />

      {/* Workstation 2: Sarah (Staff Architect - 3 Monitors) */}
      <Workstation3D
        id="ws-sarah"
        name="Sarah Arch • Lead Architect"
        role="Lead System Architect"
        position={[-11.8, 0, -4.8]}
        rotation={[0, 0, 0]}
        monitorCount={3}
        taskTitle={sarahTask?.title || "Domain Entity Reconciliation & OCC"}
        taskStatus={sarahTask?.blocked ? "BLOCKED" : sarahTask?.status || "IN_PROGRESS"}
        isBlocked={sarahTask?.blocked}
        blockReason={sarahTask?.blockReason}
        agentStatus={sarahAgent?.status || (sarahTask ? "working" : "idle")}
        screenContent="architecture"
        onInspect={() => onInspectWorkstation?.("ws-sarah")}
      />

      {/* Workstation 3: Rahul (Core Engineer - 2 Monitors) */}
      <Workstation3D
        id="ws-rahul"
        name="Rahul • Core Services"
        role="Backend Engineer"
        position={[-15.2, 0, -3.2]}
        rotation={[0, Math.PI, 0]}
        monitorCount={2}
        taskTitle={rahulTask?.title || "WebSocket Event Stream Multiplexing"}
        taskStatus={rahulTask?.blocked ? "BLOCKED" : rahulTask?.status || "IN_PROGRESS"}
        isBlocked={rahulTask?.blocked}
        blockReason={rahulTask?.blockReason}
        agentStatus={rahulAgent?.status || (rahulTask ? "working" : "idle")}
        screenContent="terminal"
        onInspect={() => onInspectWorkstation?.("ws-rahul")}
      />

      {/* Workstation 4: Maya (API Platform Engineer - 2 Monitors) */}
      <Workstation3D
        id="ws-maya"
        name="Maya • Platform Services"
        role="Platform Engineer"
        position={[-11.8, 0, -3.2]}
        rotation={[0, Math.PI, 0]}
        monitorCount={2}
        taskTitle={mayaTask?.title || "Database Migration Integrity Verification"}
        taskStatus={mayaTask?.blocked ? "BLOCKED" : mayaTask?.status || "IN_PROGRESS"}
        isBlocked={mayaTask?.blocked}
        blockReason={mayaTask?.blockReason}
        agentStatus={mayaAgent?.status || (mayaTask ? "working" : "idle")}
        screenContent="code"
        onInspect={() => onInspectWorkstation?.("ws-maya")}
      />
    </group>
  );
};
