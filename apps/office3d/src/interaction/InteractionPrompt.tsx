import React from "react";
import { useOfficeStore } from "../state/officeStore";

export const InteractionPrompt: React.FC = () => {
  const activeTarget = useOfficeStore((state) => state.activeTarget);
  const activeModal = useOfficeStore((state) => state.activeModal);

  // If no target nearby, or if a modal/panel is already open, hide prompt
  if (!activeTarget || activeModal !== null) {
    return null;
  }

  return (
    <div
      className="interaction-prompt interaction-prompt-container"
      id="proximity-interaction-prompt"
      data-testid="interaction-prompt"
    >
      <span className="prompt-key">E</span>
      <span className="prompt-text">{activeTarget.promptText}</span>
    </div>
  );
};
