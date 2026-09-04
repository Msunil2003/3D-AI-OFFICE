import { z } from "zod";

export const NormalizedStatusSchema = z.enum([
  "idle",
  "available",
  "thinking",
  "working",
  "replied",
  "blocked",
  "finished",
  "reviewed",
  "error"
]);
export type AgentRuntimeStatus = z.infer<typeof NormalizedStatusSchema>;

export interface AgentCapabilities {
  supportsPty: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsDiff: boolean;
  supportsAbort: boolean;
  supportsCustomSystemPrompt: boolean;
  supportsHeadless: boolean;
}

export type AgentEventKind =
  | "agent.status"
  | "agent.message"
  | "agent.tool_call"
  | "agent.tool_result"
  | "agent.diff"
  | "agent.error"
  | "agent.pty_output"
  | "agent.exit";

export interface BaseAgentEvent {
  kind: AgentEventKind;
  agentId: string;
  timestamp: string;
}

export interface AgentStatusEvent extends BaseAgentEvent {
  kind: "agent.status";
  status: AgentRuntimeStatus;
  summary: string;
  detail?: string;
}

export interface AgentMessageEvent extends BaseAgentEvent {
  kind: "agent.message";
  text: string;
  channel: "log" | "reply" | "task" | "system";
  author?: string;
  collapsible?: boolean;
}

export interface AgentToolCallEvent extends BaseAgentEvent {
  kind: "agent.tool_call";
  callId: string;
  toolName: string;
  input: Record<string, unknown>;
}

export interface AgentToolResultEvent extends BaseAgentEvent {
  kind: "agent.tool_result";
  callId: string;
  toolName: string;
  output: unknown;
  isError?: boolean;
}

export interface AgentDiffEvent extends BaseAgentEvent {
  kind: "agent.diff";
  filepath?: string;
  diffText: string;
  added?: number;
  removed?: number;
}

export interface AgentErrorEvent extends BaseAgentEvent {
  kind: "agent.error";
  message: string;
  code?: string;
  fatal?: boolean;
}

export interface AgentPtyOutputEvent extends BaseAgentEvent {
  kind: "agent.pty_output";
  data: string;
}

export interface AgentExitEvent extends BaseAgentEvent {
  kind: "agent.exit";
  code: number;
}

export type NormalizedAgentEvent =
  | AgentStatusEvent
  | AgentMessageEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentDiffEvent
  | AgentErrorEvent
  | AgentPtyOutputEvent
  | AgentExitEvent;

export interface RuntimeStartOptions {
  autoIntro?: boolean;
  continueConversation?: boolean;
}

export interface SendMessageOptions {
  channel?: "log" | "reply" | "task" | "system";
  role?: "user" | "assistant" | "system";
}

export interface RuntimeResetOptions {
  autoIntro?: boolean;
}

export interface AgentRuntimeConfig {
  agentId: string;
  name: string;
  provider: string; // "claude-code" | "copilot-cli" | "opencode" | "mock"
  workingDirectory: string;
  personality?: string;
  continueConversation?: boolean;
  extra?: Record<string, unknown>;
}

export interface AgentRuntime {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly workingDirectory: string;
  readonly personality?: string;

  getCapabilities(): AgentCapabilities;
  getStatus(): AgentRuntimeStatus;
  start(options?: RuntimeStartOptions): Promise<void>;
  stop(): Promise<void>;
  sendMessage(text: string, options?: SendMessageOptions): Promise<void>;
  abort(): Promise<void>;
  reset(options?: RuntimeResetOptions): Promise<void>;

  getDiff?(): Promise<string | null>;
  writePty?(data: string): void;
  resizePty?(cols: number, rows: number): void;
  getScrollback?(): string[];

  subscribe(listener: (event: NormalizedAgentEvent) => void): () => void;
}
