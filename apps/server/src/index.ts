import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { z } from "zod";
import {
  EventEnvelopeSchema,
  validatePayload,
  type EventEnvelope,
  type AgentStatusPayload,
  type AgentMessagePayload,
  type AgentPositionPayload,
  type TaskAssignPayload
} from "@office/shared";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "fs";
import { randomUUID } from "crypto";
import {
  AgentRuntime,
  NormalizedAgentEvent
} from "@office/runtime-core";
import { defaultRuntimeRegistry } from "./runtimes/index";
import { createApiRouter } from "./api-router";
import { getDefaultRepositories } from "./repositories/index";

const repos = getDefaultRepositories();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const apiRouter = createApiRouter();
app.use("/api", apiRouter);
app.get("/health", (req, res, next) => {
  req.url = "/health";
  apiRouter(req, res, next);
});
app.get("/ready", (req, res, next) => {
  req.url = "/ready";
  apiRouter(req, res, next);
});

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const dataDir = path.join(rootDir, "data");
const agentsPath = path.join(dataDir, "agents.json");
const tasksPath = path.join(dataDir, "tasks.json");
const eventsPath = path.join(dataDir, "events.jsonl");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  const raw = readFileSync(filePath, "utf-8");
  if (!raw.trim()) return fallback;
  return JSON.parse(raw) as T;
}

function writeJsonFile<T>(filePath: string, data: T) {
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const AgentRecordSchema = z.object({
  agentId: z.string(),
  name: z.string().optional(),
  desk: z.object({ x: z.number(), y: z.number() }).optional(),
  status: z
    .enum(["idle", "working", "blocked", "finished", "reviewed", "available", "thinking", "replied", "error"])
    .optional(),
  summary: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  cliType: z.enum(["claude-code", "copilot-cli", "mock", "opencode"]).optional(),
  provider: z.string().optional(),
  workingDirectory: z.string().optional(),
  messages: z
    .array(
      z.object({
        text: z.string(),
        channel: z.enum(["log", "reply", "task", "system"]),
        timestamp: z.string(),
        collapsible: z.boolean().optional()
      })
    )
    .default([]),
  lastSeen: z.string().optional()
});

type AgentRecord = z.infer<typeof AgentRecordSchema>;

const TaskRecordSchema = z.object({
  taskId: z.string(),
  agentId: z.string(),
  title: z.string(),
  details: z.string().optional(),
  status: z.enum(["assigned", "done"]).default("assigned"),
  createdAt: z.string()
});

type TaskRecord = z.infer<typeof TaskRecordSchema>;

let agents = readJsonFile<AgentRecord[]>(agentsPath, []);
let tasks = readJsonFile<TaskRecord[]>(tasksPath, []);

function persistAgents() {
  writeJsonFile(agentsPath, agents);
}

function persistTasks() {
  writeJsonFile(tasksPath, tasks);
}

function appendEvent(event: EventEnvelope) {
  appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);
}

function upsertAgent(agentId: string, update: Partial<AgentRecord>) {
  const existing = agents.find((a) => a.agentId === agentId);
  if (existing) {
    Object.assign(existing, update);
  } else {
    agents.push({ agentId, messages: [], ...update });
  }
  persistAgents();

  // Sync with SQLite domain repository
  try {
    const full = agents.find((a) => a.agentId === agentId);
    if (full) {
      const dbAgent = repos.agents.findById(agentId);
      const now = new Date().toISOString();
      if (!dbAgent) {
        repos.agents.create({
          id: agentId,
          name: full.name || agentId,
          role: "FULLSTACK",
          department: "Engineering",
          skills: { typescript: 5, node: 5, git: 5 },
          status: (full.status || "available") as any,
          summary: full.summary || "Ready",
          desk: full.desk || { x: 0, y: 0 },
          provider: full.provider || full.cliType || "opencode",
          workingDirectory: full.workingDirectory || "",
          lastSeen: full.lastSeen || now
        });
      } else {
        repos.agents.update(agentId, {
          name: full.name,
          status: full.status as any,
          summary: full.summary,
          desk: full.desk,
          provider: full.provider || full.cliType,
          workingDirectory: full.workingDirectory,
          lastSeen: full.lastSeen || now
        });
      }
    }
  } catch (err) {
    console.warn(`[upsertAgent] SQLite agent sync notice:`, err);
  }
}

// Sync initial agents to SQLite domain repository
for (const a of agents) {
  upsertAgent(a.agentId, {});
}

function applyEvent(event: EventEnvelope) {
  const now = new Date().toISOString();
  const { agentId } = event;
  if (event.type === "agent.status") {
    const payload = validatePayload(event.type, event.payload) as AgentStatusPayload;
    upsertAgent(agentId, { status: payload.status, summary: payload.summary, lastSeen: now });
  }
  if (event.type === "agent.message") {
    const payload = validatePayload(event.type, event.payload) as AgentMessagePayload;
    const existing = agents.find((a) => a.agentId === agentId);
    const messages = existing?.messages ?? [];
    messages.push({
      text: payload.text,
      channel: payload.channel as any,
      timestamp: event.timestamp,
      collapsible: payload.collapsible
    });
    const trimmed = messages.slice(-20);
    upsertAgent(agentId, { messages: trimmed, lastSeen: now });
  }
  if (event.type === "agent.position") {
    const payload = validatePayload(event.type, event.payload) as AgentPositionPayload;
    upsertAgent(agentId, { position: payload, lastSeen: now });
  }
  if (event.type === "task.assign") {
    const payload = validatePayload(event.type, event.payload) as TaskAssignPayload;
    const existing = tasks.find((t) => t.taskId === payload.taskId);
    if (existing) {
      existing.title = payload.title;
      existing.details = payload.details;
      existing.status = "assigned";
    } else {
      tasks.push({
        taskId: payload.taskId,
        agentId,
        title: payload.title,
        details: payload.details,
        status: "assigned",
        createdAt: now
      });
    }
    persistTasks();
  }
}

// ============ Terminal WebSocket client tracking ============

const terminalSockets = new Map<string, Set<WebSocket>>();

function attachRuntimeEvents(runtime: AgentRuntime) {
  runtime.subscribe((event: NormalizedAgentEvent) => {
    // Only process events for agents that currently exist
    const agentExists = agents.some((a) => a.agentId === event.agentId);
    if (!agentExists) return;

    const now = event.timestamp || new Date().toISOString();

    if (event.kind === "agent.status") {
      const envelope: EventEnvelope = {
        type: "agent.status",
        agentId: event.agentId,
        timestamp: now,
        payload: { status: event.status, summary: event.summary }
      };
      applyEvent(envelope);
      appendEvent(envelope);
      broadcast(envelope);
    } else if (event.kind === "agent.message") {
      const envelope: EventEnvelope = {
        type: "agent.message",
        agentId: event.agentId,
        timestamp: now,
        payload: {
          text: event.text,
          channel: event.channel === "system" ? "log" : event.channel,
          collapsible: event.collapsible
        }
      };
      applyEvent(envelope);
      appendEvent(envelope);
      broadcast(envelope);
    } else if (event.kind === "agent.pty_output") {
      const sockets = terminalSockets.get(event.agentId);
      if (sockets) {
        const msg = JSON.stringify({ type: "output", data: event.data });
        for (const ws of sockets) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
          }
        }
      }
    } else if (event.kind === "agent.exit") {
      const sockets = terminalSockets.get(event.agentId);
      if (sockets) {
        const msg = JSON.stringify({ type: "exit", code: event.code });
        for (const ws of sockets) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
          }
        }
      }
    } else if (event.kind === "agent.tool_call" || event.kind === "agent.diff") {
      // Broadcast for real-time 3D viewers and observers
      const envelope: EventEnvelope = {
        type: "agent.message",
        agentId: event.agentId,
        timestamp: now,
        payload: {
          text: event.kind === "agent.diff" ? `[Diff] ${event.filepath}: ${event.diffText}` : `[Tool] ${event.toolName}`,
          channel: "log",
          collapsible: true
        }
      };
      applyEvent(envelope);
      appendEvent(envelope);
      broadcast(envelope);
    }
  });
}

/** Lazily ensure/restore an active runtime for an agent */
async function ensureAgentRuntime(agentId: string): Promise<AgentRuntime | null> {
  const existing = defaultRuntimeRegistry.getRuntime(agentId);
  if (existing) return existing;

  const agent = agents.find((a) => a.agentId === agentId);
  if (!agent?.workingDirectory) return null;

  const provider = (agent as any).provider || agent.cliType || "claude-code";
  try {
    const runtime = await defaultRuntimeRegistry.createRuntime({
      agentId,
      name: agent.name || agentId,
      provider,
      workingDirectory: agent.workingDirectory
    });
    attachRuntimeEvents(runtime);
    await runtime.start({ autoIntro: false, continueConversation: true });
    return runtime;
  } catch (err) {
    console.error(`[ensureAgentRuntime:${agentId}] Failed to restore runtime:`, err);
    return null;
  }
}

// ============ HTTP Routes ============

const RegisterSchema = z.object({
  agentId: z.string().min(1),
  name: z.string().optional(),
  desk: z.object({ x: z.number(), y: z.number() }).optional(),
  cliType: z.enum(["claude-code", "copilot-cli", "mock", "opencode"]).optional(),
  provider: z.string().optional(),
  workingDirectory: z.string().optional()
});

app.post("/agents/register", (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { agentId, name, desk, cliType, provider, workingDirectory } = parsed.data;
  const existing = agents.find((a) => a.agentId === agentId);
  const chosenProvider = provider || cliType || existing?.provider || existing?.cliType || "claude-code";

  const next = {
    agentId,
    name: name ?? existing?.name,
    desk: desk ?? existing?.desk,
    status: existing?.status ?? "idle",
    summary: existing?.summary ?? "",
    position: existing?.position ?? desk ?? existing?.desk,
    cliType: (cliType ?? existing?.cliType ?? (["claude-code", "copilot-cli", "mock", "opencode"].includes(chosenProvider) ? chosenProvider : "claude-code")) as any,
    provider: chosenProvider,
    workingDirectory: workingDirectory ?? existing?.workingDirectory,
    messages: existing?.messages ?? [],
    lastSeen: new Date().toISOString()
  } satisfies AgentRecord;
  upsertAgent(agentId, next);

  const snapshot: EventEnvelope = {
    type: "snapshot",
    agentId: "system",
    timestamp: new Date().toISOString(),
    payload: { agents, tasks }
  };
  broadcast(snapshot);
  res.json(next);
});

app.get("/agents", (_req, res) => {
  res.json(agents);
});

// Delete an agent
app.delete("/agents/:agentId", async (req, res) => {
  const { agentId } = req.params;

  const index = agents.findIndex((a) => a.agentId === agentId);
  if (index !== -1) {
    agents.splice(index, 1);
    persistAgents();
    try {
      repos.agents.delete(agentId);
    } catch {}
  }

  // Stop runtime via registry
  await defaultRuntimeRegistry.removeRuntime(agentId);

  // Close connected terminal sockets
  const sockets = terminalSockets.get(agentId);
  if (sockets) {
    for (const ws of sockets) {
      try {
        ws.close(1000, "Agent deleted");
      } catch {}
    }
    terminalSockets.delete(agentId);
  }

  const snapshot: EventEnvelope = {
    type: "snapshot",
    agentId: "system",
    timestamp: new Date().toISOString(),
    payload: { agents, tasks }
  };
  broadcast(snapshot);

  res.json({ ok: true });
});

// Control command (reset, abort)
app.post("/agents/:agentId/control", async (req, res) => {
  const { agentId } = req.params;
  const { command } = req.body;

  if (!["reset", "delete", "abort"].includes(command)) {
    res.status(400).json({ error: "Invalid command" });
    return;
  }

  if (command === "reset") {
    const agent = agents.find((a) => a.agentId === agentId);
    if (agent) {
      agent.messages = [];
      agent.status = "available";
      agent.summary = "Ready";
      persistAgents();
    }

    const runtime = defaultRuntimeRegistry.getRuntime(agentId);
    if (runtime) {
      await runtime.reset({ autoIntro: true });
    }

    const snapshot: EventEnvelope = {
      type: "snapshot",
      agentId: "system",
      timestamp: new Date().toISOString(),
      payload: { agents, tasks }
    };
    broadcast(snapshot);
  } else if (command === "abort") {
    const runtime = defaultRuntimeRegistry.getRuntime(agentId);
    if (runtime) {
      await runtime.abort();
    }
  }

  res.json({ ok: true });
});

// Diff inspection endpoint
app.get("/agents/:agentId/diff", async (req, res) => {
  const { agentId } = req.params;
  const runtime = defaultRuntimeRegistry.getRuntime(agentId);
  if (!runtime || !runtime.getDiff) {
    res.json({ diff: null });
    return;
  }
  try {
    const diff = await runtime.getDiff();
    res.json({ diff });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to get diff" });
  }
});

// Runtime providers / capabilities discovery
app.get("/runtimes/capabilities", (_req, res) => {
  const providers = defaultRuntimeRegistry.getSupportedProviders();
  const capabilities: Record<string, any> = {};
  for (const p of providers) {
    capabilities[p] = defaultRuntimeRegistry.getProviderCapabilities(p);
  }
  res.json({ providers, capabilities });
});

const TaskCreateSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1),
  details: z.string().optional()
});

app.post("/tasks", (req, res) => {
  const parsed = TaskCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { agentId, title, details } = parsed.data;
  const taskId = randomUUID();
  const event: EventEnvelope = {
    type: "task.assign",
    agentId,
    timestamp: new Date().toISOString(),
    payload: { taskId, title, details }
  };
  applyEvent(event);
  appendEvent(event);
  broadcast(event);
  res.json({ taskId });
});

app.get("/tasks", (_req, res) => {
  res.json(tasks);
});

app.post("/events", async (req, res) => {
  const parsed = EventEnvelopeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const envelope = parsed.data;
  try {
    validatePayload(envelope.type, envelope.payload);
  } catch (error) {
    res.status(400).json({ error: String(error) });
    return;
  }
  applyEvent(envelope);
  appendEvent(envelope);
  broadcast(envelope);

  // Chat message -> runtime bridge
  if (envelope.type === "agent.message") {
    const payload = envelope.payload as { text: string; channel: string };
    if (payload.channel === "task") {
      const runtime = await ensureAgentRuntime(envelope.agentId);
      if (runtime) {
        runtime.sendMessage(payload.text, { channel: "task" }).catch((err) => {
          console.error(`[runtime:${envelope.agentId}] Send message error:`, err);
        });
      }
    }
  }

  res.json({ ok: true });
});

const adjectives = ["Swift", "Clever", "Brave", "Calm", "Eager", "Fancy", "Jolly", "Lucky", "Noble", "Quick", "Sharp", "Witty", "Zen", "Bold", "Cool"];
const nouns = ["Fox", "Owl", "Bear", "Wolf", "Hawk", "Lion", "Tiger", "Panda", "Raven", "Falcon", "Phoenix", "Dragon", "Ninja", "Coder", "Dev"];
function randomAgentName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

function randomDesk(): { x: number; y: number } {
  const desks = [
    { x: 195, y: 617 }, { x: 645, y: 618 }, { x: 195, y: 450 },
    { x: 645, y: 450 }, { x: 420, y: 530 }, { x: 300, y: 350 },
    { x: 540, y: 350 }
  ];
  const base = desks[Math.floor(Math.random() * desks.length)];
  return {
    x: base.x + Math.floor(Math.random() * 40) - 20,
    y: base.y + Math.floor(Math.random() * 40) - 20
  };
}

const SpawnSchema = z.object({
  name: z.string().optional(),
  cliType: z.enum(["claude-code", "copilot-cli", "mock", "opencode"]).default("claude-code"),
  provider: z.string().optional(),
  workingDirectory: z.string().min(1),
  personality: z.string().optional(),
  continueConversation: z.boolean().default(false)
});

app.post("/agents/spawn", async (req, res) => {
  const parsed = SpawnSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { personality, continueConversation } = parsed.data;
  const provider = parsed.data.provider || parsed.data.cliType || "claude-code";

  let workingDirectory = parsed.data.workingDirectory;
  if (process.platform === "linux" && workingDirectory && /^[A-Za-z]:\\/.test(workingDirectory)) {
    const drive = workingDirectory[0].toLowerCase();
    workingDirectory = `/mnt/${drive}/${workingDirectory.slice(3).replace(/\\/g, "/")}`;
  }
  const name = parsed.data.name?.trim() || randomAgentName();
  const agentId = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const desk = randomDesk();

  // Register in memory & persist
  upsertAgent(agentId, {
    agentId,
    name,
    desk,
    status: "available",
    summary: "Ready",
    position: desk,
    cliType: parsed.data.cliType,
    provider,
    workingDirectory,
    messages: [],
    lastSeen: new Date().toISOString()
  });

  console.log(`[spawn:${name}] Spawning ${provider} runtime — agentId: ${agentId}`);

  try {
    const runtime = await defaultRuntimeRegistry.createRuntime({
      agentId,
      name,
      provider,
      workingDirectory,
      personality: personality?.trim() || "",
      continueConversation
    });

    attachRuntimeEvents(runtime);
    await runtime.start({
      autoIntro: !continueConversation,
      continueConversation
    });
  } catch (err: any) {
    console.error(`[spawn:${agentId}] Failed to start runtime:`, err);
    const idx = agents.findIndex((a) => a.agentId === agentId);
    if (idx !== -1) {
      agents.splice(idx, 1);
      persistAgents();
    }
    res.status(500).json({ error: err?.message || "Failed to spawn agent" });
    return;
  }

  // Broadcast snapshot
  const snapshot: EventEnvelope = {
    type: "snapshot",
    agentId: "system",
    timestamp: new Date().toISOString(),
    payload: { agents, tasks }
  };
  broadcast(snapshot);

  res.json({ ok: true, agentId, message: `Agent "${name}" spawned in ${workingDirectory}` });
});

// ============ HTTP Server + WebSocket ============

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });
const terminalWss = new WebSocketServer({ noServer: true });

const clients = new Set<WebSocket>();

function broadcast(event: EventEnvelope) {
  const message = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

wss.on("connection", (socket) => {
  clients.add(socket);
  const snapshot: EventEnvelope = {
    type: "snapshot",
    agentId: "system",
    timestamp: new Date().toISOString(),
    payload: { agents, tasks }
  };
  socket.send(JSON.stringify(snapshot));

  socket.on("message", async (data) => {
    try {
      const parsed = EventEnvelopeSchema.safeParse(JSON.parse(data.toString()));
      if (!parsed.success) {
        socket.send(JSON.stringify({ error: parsed.error.message }));
        return;
      }
      const envelope = parsed.data;
      validatePayload(envelope.type, envelope.payload);
      applyEvent(envelope);
      appendEvent(envelope);
      broadcast(envelope);

      if (envelope.type === "agent.message") {
        const payload = envelope.payload as { text: string; channel: string };
        if (payload.channel === "task") {
          const runtime = await ensureAgentRuntime(envelope.agentId);
          if (runtime) {
            runtime.sendMessage(payload.text, { channel: "task" }).catch((err) => {
              console.error(`[ws:runtime:${envelope.agentId}] Message send error:`, err);
            });
          }
        }
      }
    } catch (error) {
      socket.send(JSON.stringify({ error: String(error) }));
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
  });
});

// ============ Terminal WebSocket endpoint ============

terminalWss.on("connection", async (socket: WebSocket, req: http.IncomingMessage) => {
  const urlParts = req.url?.split("/") ?? [];
  const agentId = urlParts[urlParts.length - 1];

  if (!agentId) {
    socket.close(1008, "Missing agentId");
    return;
  }

  const agent = agents.find((a) => a.agentId === agentId);
  if (!agent) {
    socket.send(JSON.stringify({ type: "error", data: "Agent not found." }));
    socket.close(1008, "Agent not found");
    return;
  }

  const runtime = await ensureAgentRuntime(agentId);
  if (!runtime) {
    socket.send(
      JSON.stringify({
        type: "error",
        data: "Failed to create terminal session. Check that the working directory exists."
      })
    );
    socket.close(1011, "Runtime spawn failed");
    return;
  }

  if (!terminalSockets.has(agentId)) {
    terminalSockets.set(agentId, new Set());
  }
  const sessionSockets = terminalSockets.get(agentId)!;
  sessionSockets.add(socket);

  console.log(`[terminal:${agentId}] Client connected (${sessionSockets.size} clients)`);

  // Send scrollback for catch-up
  const scrollback = runtime.getScrollback?.() ?? [];
  if (scrollback.length > 0) {
    socket.send(JSON.stringify({ type: "output", data: scrollback.join("") }));
  }

  socket.on("message", (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString());
      if (msg.type === "input" && typeof msg.data === "string") {
        runtime.writePty?.(msg.data);
      } else if (msg.type === "resize" && typeof msg.cols === "number" && typeof msg.rows === "number") {
        runtime.resizePty?.(msg.cols, msg.rows);
      }
    } catch {
      // Ignore
    }
  });

  socket.on("close", () => {
    sessionSockets.delete(socket);
    console.log(`[terminal:${agentId}] Client disconnected (${sessionSockets.size} remaining)`);
  });
});

// Upgrade routing
server.on("upgrade", (request, socket, head) => {
  const { url } = request;

  if (url === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else if (url?.startsWith("/ws/terminal/")) {
    terminalWss.handleUpgrade(request, socket, head, (ws) => {
      terminalWss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

const PORT = Number(process.env.PORT ?? 3003);
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
