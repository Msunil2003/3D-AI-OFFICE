import React, { useEffect, useState } from "react";

interface DiffViewProps {
  agentId: string;
  getDiff: (agentId: string) => Promise<string | null>;
}

export const DiffView: React.FC<DiffViewProps> = ({ agentId, getDiff }) => {
  const [diffText, setDiffText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDiff(agentId).then((result) => {
      if (active) {
        setDiffText(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [agentId, getDiff]);

  if (loading) {
    return (
      <div className="diff-container" style={{ color: "#9ca3af" }}>
        Loading active workspace diffs...
      </div>
    );
  }

  if (!diffText) {
    return (
      <div className="diff-container" style={{ color: "#6b7280" }}>
        No pending diffs or uncommitted changes recorded for this session.
      </div>
    );
  }

  const lines = diffText.split("\n");

  return (
    <div className="diff-container">
      {lines.map((line, idx) => {
        let className = "";
        if (line.startsWith("+") && !line.startsWith("+++")) {
          className = "diff-line-add";
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          className = "diff-line-del";
        } else if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
          className = "diff-line-meta";
        }
        return (
          <span key={idx} className={className}>
            {line || " "}
          </span>
        );
      })}
    </div>
  );
};
