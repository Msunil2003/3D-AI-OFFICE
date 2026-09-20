import React, { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AgentData } from "../hooks/useOfficeSocket";
import { AgentCharacter } from "./AgentCharacter";
import { MovementController } from "../navigation/MovementController";
import { findPath } from "../navigation/Pathfinding";
import { CAMPUS_WAYPOINTS } from "../navigation/NavigationGraph";

export interface AgentMovementProps {
  agent: AgentData;
  defaultPosition: [number, number, number];
  targetDestination?: string | null;
  isSelected?: boolean;
  onSelect?: () => void;
  currentTaskTitle?: string;
}

export const AgentMovement: React.FC<AgentMovementProps> = ({
  agent,
  defaultPosition,
  targetDestination,
  isSelected = false,
  onSelect,
  currentTaskTitle
}) => {
  const movementRef = useRef<MovementController | null>(null);
  const [currentPos, setCurrentPos] = useState<[number, number, number]>(defaultPosition);
  const [currentRotY, setCurrentRotY] = useState(0);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (!movementRef.current) {
      movementRef.current = new MovementController(defaultPosition);
    }
  }, [defaultPosition]);

  useEffect(() => {
    if (!movementRef.current || !targetDestination) return;

    // Find waypoint closest to current position
    const goalWaypoint = CAMPUS_WAYPOINTS[targetDestination];
    if (goalWaypoint) {
      const path = findPath("backend_pod", targetDestination);
      movementRef.current.setPath(path);
    }
  }, [targetDestination]);

  useFrame((_, delta) => {
    if (movementRef.current) {
      const result = movementRef.current.update(delta);
      if (result.isMoving) {
        setCurrentPos([...result.position]);
        setCurrentRotY(result.rotationY);
        setIsMoving(true);
      } else if (isMoving) {
        setIsMoving(false);
      }
    }
  });

  return (
    <AgentCharacter
      agent={agent}
      position={currentPos}
      rotation={[0, currentRotY, 0]}
      isSelected={isSelected}
      onSelect={onSelect}
      currentTaskTitle={currentTaskTitle}
      isSeated={!isMoving}
      isMoving={isMoving}
    />
  );
};
