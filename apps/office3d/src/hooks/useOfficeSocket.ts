import { useState, useEffect, useRef, useCallback } from "react";

export interface AgentMessage {
  text: string;
  channel: "log" | "reply" | "task" | "system";
  timestamp: string;
  collapsible?: boolean;
}

export interface AgentData {
  agentId: string;
  name: string;
  status: "idle" | "working" | "blocked" | "finished" | "reviewed" | "available" | "thinking" | "replied" | "error";
  summary: string;
  desk?: { x: number; y: number };
  position?: { x: number; y: number };
  cliType?: string;
  provider?: string;
  workingDirectory?: string;
  messages: AgentMessage[];
  lastSeen?: string;
}

export interface TaskData {
  taskId: string;
  agentId: string;
  title: string;
  details?: string;
  status: "assigned" | "done";
  createdAt: string;
}

export function useOfficeSocket(serverUrl = "http://localhost:3003", wsUrl = "ws://localhost:3003/ws") {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: any = null;

    function connect() {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data);
          setRecentEvents((prev) => [envelope, ...prev.slice(0, 49)]);

          if (envelope.type === "snapshot") {
            setAgents(envelope.payload?.agents || []);
            setTasks(envelope.payload?.tasks || []);
          } else if (envelope.type === "agent.status") {
            setAgents((prev) =>
              prev.map((a) =>
                a.agentId === envelope.agentId
                  ? { ...a, status: envelope.payload.status, summary: envelope.payload.summary }
                  : a
              )
            );
          } else if (envelope.type === "agent.message") {
            setAgents((prev) =>
              prev.map((a) => {
                if (a.agentId !== envelope.agentId) return a;
                const newMsg: AgentMessage = {
                  text: envelope.payload.text,
                  channel: envelope.payload.channel || "reply",
                  timestamp: envelope.timestamp || new Date().toISOString(),
                  collapsible: envelope.payload.collapsible
                };
                return {
                  ...a,
                  messages: [...a.messages, newMsg].slice(-30)
                };
              })
            );
          }
        } catch (err) {
          console.warn("[useOfficeSocket] JSON parse error:", err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [wsUrl]);

  const sendChatMessage = useCallback(
    async (agentId: string, text: string) => {
      try {
        await fetch(`${serverUrl}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "agent.message",
            agentId,
            timestamp: new Date().toISOString(),
            payload: { text, channel: "task" }
          })
        });
      } catch (err) {
        console.error("[useOfficeSocket] Error sending chat:", err);
      }
    },
    [serverUrl]
  );

  const spawnAgent = useCallback(
    async (params: {
      name?: string;
      provider?: string;
      cliType?: string;
      workingDirectory: string;
      personality?: string;
    }) => {
      const res = await fetch(`${serverUrl}/agents/spawn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: params.name,
          cliType: (params.provider || params.cliType || "claude-code") as any,
          provider: params.provider,
          workingDirectory: params.workingDirectory,
          personality: params.personality
        })
      });
      return await res.json();
    },
    [serverUrl]
  );

  const resetAgent = useCallback(
    async (agentId: string) => {
      await fetch(`${serverUrl}/agents/${agentId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "reset" })
      });
    },
    [serverUrl]
  );

  const abortAgent = useCallback(
    async (agentId: string) => {
      await fetch(`${serverUrl}/agents/${agentId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "abort" })
      });
    },
    [serverUrl]
  );

  const deleteAgent = useCallback(
    async (agentId: string) => {
      await fetch(`${serverUrl}/agents/${agentId}`, {
        method: "DELETE"
      });
    },
    [serverUrl]
  );

  const getDiff = useCallback(
    async (agentId: string): Promise<string | null> => {
      try {
        const res = await fetch(`${serverUrl}/agents/${agentId}/diff`);
        const data = await res.json();
        return data.diff ?? null;
      } catch {
        return null;
      }
    },
    [serverUrl]
  );

  return {
    connected,
    agents,
    tasks,
    recentEvents,
    sendChatMessage,
    spawnAgent,
    resetAgent,
    abortAgent,
    deleteAgent,
    getDiff
  };
}
