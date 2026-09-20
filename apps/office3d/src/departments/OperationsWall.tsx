import React from "react";
import { Text } from "@react-three/drei";

export interface OperationsTaskItem {
  id: string;
  title: string;
  status: string;
  assigneeName?: string;
  blocked?: boolean;
}

export interface OperationsWallProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  tasks?: OperationsTaskItem[];
  onSelectTask?: (taskId: string) => void;
  onInspectWall?: () => void;
}

export const OperationsWall: React.FC<OperationsWallProps> = ({
  position = [-20.0, 1.8, 0],
  rotation = [0, Math.PI / 2, 0],
  tasks = [],
  onSelectTask,
  onInspectWall
}) => {
  const columns = [
    { key: "READY", label: "READY", color: "#64748b" },
    { key: "ASSIGNED", label: "ASSIGNED", color: "#38bdf8" },
    { key: "IN_PROGRESS", label: "IN PROGRESS", color: "#818cf8" },
    { key: "TESTING", label: "TESTING", color: "#10b981" },
    { key: "REVIEW", label: "REVIEW", color: "#f59e0b" },
    { key: "MERGED", label: "MERGED / DONE", color: "#22c55e" }
  ];

  return (
    <group position={position} rotation={rotation} name="engineering-operations-wall" onClick={onInspectWall}>
      {/* Wall Display Board Backing (Length 10m, Height 2.8m) */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[10.2, 2.8, 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* Sleek Border Frame */}
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[10.0, 2.6]} />
        <meshStandardMaterial color="#0b1120" roughness={0.2} metalness={0.3} />
      </mesh>

      {/* Header Plaque */}
      <Text
        position={[0, 1.15, 0.07]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.14}
        fontWeight="bold"
      >
        ENGINEERING OPERATIONS & TASK PIPELINE
      </Text>
      <Text
        position={[0, 0.98, 0.07]}
        fontSize={0.075}
        color="#38bdf8"
        anchorX="center"
        anchorY="middle"
      >
        REAL-TIME REPOSITORY KANBAN & CI/CD LIFECYCLE
      </Text>

      {/* 6 Kanban Column Columns */}
      {columns.map((col, idx) => {
        const colX = -4.1 + idx * 1.64;
        const colTasks = tasks.filter((t) => {
          if (col.key === "MERGED") return t.status === "MERGED" || t.status === "DONE";
          return t.status === col.key;
        });

        return (
          <group key={col.key} position={[colX, 0, 0.07]}>
            {/* Column Header Box */}
            <mesh position={[0, 0.72, 0]}>
              <boxGeometry args={[1.5, 0.22, 0.02]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, 0.61, 0.012]}>
              <planeGeometry args={[1.46, 0.02]} />
              <meshBasicMaterial color={col.color} />
            </mesh>
            <Text
              position={[0, 0.72, 0.015]}
              fontSize={0.07}
              color={col.color}
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {col.label}
            </Text>

            {/* Render up to 3 task card badges */}
            {colTasks.slice(0, 3).map((task, tIdx) => (
              <group
                key={task.id}
                position={[0, 0.42 - tIdx * 0.42, 0.01]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTask?.(task.id);
                }}
              >
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[1.48, 0.34, 0.02]} />
                  <meshStandardMaterial color={task.blocked ? "#450a0a" : "#131d31"} roughness={0.3} />
                </mesh>
                {/* Left accent strip */}
                <mesh position={[-0.72, 0, 0.012]}>
                  <boxGeometry args={[0.04, 0.32, 0.01]} />
                  <meshBasicMaterial color={task.blocked ? "#ef4444" : col.color} />
                </mesh>
                <Text
                  position={[-0.65, 0.08, 0.015]}
                  fontSize={0.055}
                  color={task.blocked ? "#fca5a5" : "#ffffff"}
                  anchorX="left"
                  anchorY="top"
                  maxWidth={1.3}
                  fontWeight="bold"
                >
                  {task.title.slice(0, 24)}
                </Text>
                <Text
                  position={[-0.65, -0.06, 0.015]}
                  fontSize={0.045}
                  color="#94a3b8"
                  anchorX="left"
                  anchorY="top"
                >
                  {task.assigneeName ? `Assigned: ${task.assigneeName}` : "Unassigned"}
                </Text>
              </group>
            ))}

            {/* Empty placeholder if no tasks */}
            {colTasks.length === 0 && (
              <Text position={[0, 0.35, 0.01]} fontSize={0.055} color="#475569" anchorX="center" anchorY="middle">
                Empty
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
};
