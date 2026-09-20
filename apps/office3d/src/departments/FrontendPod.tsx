import React from "react";
import { Workstation3D } from "../components/Workstation3D";
import { Text } from "@react-three/drei";

export interface FrontendPodProps {
  onInspectWorkstation?: (id: string) => void;
  tasks?: any[];
  agents?: any[];
}

export const FrontendPod: React.FC<FrontendPodProps> = ({
  onInspectWorkstation,
  tasks = [],
  agents = []
}) => {
  const elenaTask = tasks.find((t: any) =>
    (t.assigneeId && t.assigneeId.toLowerCase().includes("elena")) ||
    (t.assigneeName && t.assigneeName.toLowerCase().includes("elena"))
  );

  const liamTask = tasks.find((t: any) =>
    (t.assigneeId && t.assigneeId.toLowerCase().includes("liam")) ||
    (t.assigneeName && t.assigneeName.toLowerCase().includes("liam"))
  );

  const elenaAgent = agents.find((a: any) => a.name?.toLowerCase().includes("elena") || a.agentId?.toLowerCase().includes("elena"));
  const liamAgent = agents.find((a: any) => a.name?.toLowerCase().includes("liam") || a.agentId?.toLowerCase().includes("liam"));

  return (
    <group name="engineering-frontend-pod">
      <group position={[-13.5, 2.8, 2.8]}>
        <mesh>
          <boxGeometry args={[3.2, 0.32, 0.05]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
        </mesh>
        <Text position={[0, 0, 0.03]} fontSize={0.12} color="#a855f7" anchorX="center" anchorY="middle" fontWeight="bold">
          FRONTEND & UI POD
        </Text>
      </group>

      {/* Workstations */}
      <Workstation3D
        id="ws-front-1"
        name="Elena • UI Systems"
        role="Frontend Engineer"
        position={[-15.2, 0, 2.0]}
        rotation={[0, 0, 0]}
        monitorCount={2}
        taskTitle={elenaTask?.title || "3D WebGL Canvas Rendering Optimizations"}
        taskStatus={elenaTask?.blocked ? "BLOCKED" : elenaTask?.status || (elenaTask ? "IN_PROGRESS" : "IDLE")}
        isBlocked={elenaTask?.blocked}
        blockReason={elenaTask?.blockReason}
        agentStatus={elenaAgent?.status || (elenaTask ? "working" : "idle")}
        screenContent="code"
        onInspect={() => onInspectWorkstation?.("ws-front-1")}
      />

      <Workstation3D
        id="ws-front-2"
        name="Liam • State Architecture"
        role="UI Systems Lead"
        position={[-11.8, 0, 2.0]}
        rotation={[0, 0, 0]}
        monitorCount={2}
        taskTitle={liamTask?.title || "Contextual Panel ESC Key Management"}
        taskStatus={liamTask?.blocked ? "BLOCKED" : liamTask?.status || (liamTask ? "IN_PROGRESS" : "IDLE")}
        isBlocked={liamTask?.blocked}
        blockReason={liamTask?.blockReason}
        agentStatus={liamAgent?.status || (liamTask ? "working" : "idle")}
        screenContent="terminal"
        onInspect={() => onInspectWorkstation?.("ws-front-2")}
      />
    </group>
  );
};
