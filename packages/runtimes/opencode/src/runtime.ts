import {
  AgentCapabilities,
  AgentRuntime,
  AgentRuntimeConfig,
  AgentRuntimeStatus,
  NormalizedAgentEvent,
  RuntimeResetOptions,
  RuntimeStartOptions,
  SendMessageOptions
} from "@office/runtime-core";
import type { OpencodeClient } from "@opencode-ai/sdk";
import { defaultOpenCodeServerManager, OpenCodeServerManager } from "./server-manager.js";

export const OPENCODE_CAPABILITIES: AgentCapabilities = {
  supportsPty: false,
  supportsTools: true,
  supportsStreaming: true,
  supportsDiff: true,
  supportsAbort: true,
  supportsCustomSystemPrompt: true,
  supportsHeadless: true
};

export interface OpenCodeRuntimeOptions {
  serverManager?: OpenCodeServerManager;
  model?: {
    providerID: string;
    modelID: string;
  };
}

export class OpenCodeRuntime implements AgentRuntime {
  readonly id: string;
  readonly name: string;
  readonly provider: string = "opencode";
  readonly workingDirectory: string;
  readonly personality?: string;

  private serverManager: OpenCodeServerManager;
  private client: OpencodeClient | null = null;
  private sessionId: string | null = null;
  private status: AgentRuntimeStatus = "idle";
  private listeners = new Set<(event: NormalizedAgentEvent) => void>();
  private sseAbortController: AbortController | null = null;
  private currentDiffText: string | null = null;
  private scrollback: string[] = [];

  constructor(config: AgentRuntimeConfig, options: OpenCodeRuntimeOptions = {}) {
    this.id = config.agentId;
    this.name = config.name;
    this.workingDirectory = config.workingDirectory;
    this.personality = config.personality;
    this.serverManager = options.serverManager ?? defaultOpenCodeServerManager;
  }

  getCapabilities(): AgentCapabilities {
    return OPENCODE_CAPABILITIES;
  }

  getStatus(): AgentRuntimeStatus {
    return this.status;
  }

  private emit(event: NormalizedAgentEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[OpenCodeRuntime:${this.id}] Error in listener:`, err);
      }
    }
  }

  private setStatus(status: AgentRuntimeStatus, summary: string, detail?: string) {
    this.status = status;
    this.emit({
      kind: "agent.status",
      agentId: this.id,
      timestamp: new Date().toISOString(),
      status,
      summary,
      detail
    });
  }

  private postMessage(text: string, channel: "log" | "reply" | "task" | "system", author = this.name, collapsible?: boolean) {
    this.emit({
      kind: "agent.message",
      agentId: this.id,
      timestamp: new Date().toISOString(),
      text,
      channel,
      author,
      collapsible
    });
  }

  async start(options?: RuntimeStartOptions): Promise<void> {
    const serverInstance = await this.serverManager.getServer();
    const client = serverInstance.client;
    this.client = client;

    // Create session in working directory
    const createRes = await client.session.create({
      body: {
        title: `${this.name} (${this.id})`
      },
      query: {
        directory: this.workingDirectory
      }
    });

    if (!createRes.data) {
      throw new Error(`[OpenCodeRuntime] Failed to create OpenCode session: ${createRes.error}`);
    }

    this.sessionId = createRes.data.id;
    this.setStatus("available", "Ready");
    this.scrollback.push(`[OpenCode] Connected to session ${this.sessionId} at ${serverInstance.url}\r\n`);

    // Start streaming events
    this.startEventSubscription();

    if (options?.autoIntro) {
      const introPrompt = `Introduce yourself briefly — who you are and what you see in the workspace.`;
      await this.sendMessage(introPrompt, { channel: "task" });
    }
  }

  private async startEventSubscription() {
    if (!this.client || !this.sessionId) return;

    this.sseAbortController = new AbortController();

    try {
      const sseResult = await this.client.event.subscribe({
        query: {
          directory: this.workingDirectory
        },
        signal: this.sseAbortController.signal
      });

      this.consumeEventStream(sseResult.stream);
    } catch (err) {
      console.warn(`[OpenCodeRuntime:${this.id}] Event subscription warning:`, err);
    }
  }

  private async consumeEventStream(stream: AsyncIterable<any>) {
    try {
      for await (const rawEvent of stream) {
        if (!rawEvent) continue;
        this.handleOpenCodeEvent(rawEvent);
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.warn(`[OpenCodeRuntime:${this.id}] Event stream error:`, err);
    }
  }

  private handleOpenCodeEvent(event: any) {
    if (!event || typeof event !== "object") return;
    const type = event.type;
    const props = event.properties ?? {};

    // Filter by session if applicable
    if (props.sessionID && this.sessionId && props.sessionID !== this.sessionId) {
      return;
    }

    switch (type) {
      case "session.status": {
        const statusObj = props.status;
        if (statusObj?.type === "busy") {
          this.setStatus("thinking", "Thinking...");
        } else if (statusObj?.type === "idle") {
          this.setStatus("replied", "Ready");
        } else if (statusObj?.type === "retry") {
          this.setStatus("thinking", `Retrying: ${statusObj.message}`);
        }
        break;
      }

      case "session.idle": {
        this.setStatus("replied", "Ready");
        break;
      }

      case "message.updated": {
        const info = props.info;
        if (info?.error) {
          this.emit({
            kind: "agent.error",
            agentId: this.id,
            timestamp: new Date().toISOString(),
            message: info.error.data?.message || "OpenCode message error"
          });
          this.setStatus("error", "Error occurred");
        }
        break;
      }

      case "message.part.updated": {
        const part = props.part;
        if (!part) break;

        if (part.type === "text" && part.text) {
          this.postMessage(part.text, "reply");
        } else if (part.type === "reasoning" && part.text) {
          this.postMessage(part.text, "log", this.name, true);
        } else if (part.type === "tool") {
          const state = part.state;
          if (state?.status === "running" || state?.status === "pending") {
            this.emit({
              kind: "agent.tool_call",
              agentId: this.id,
              timestamp: new Date().toISOString(),
              callId: part.callID || part.id,
              toolName: part.tool,
              input: state.input || {}
            });
            this.setStatus("working", `Running ${part.tool}`);
          } else if (state?.status === "completed") {
            this.emit({
              kind: "agent.tool_result",
              agentId: this.id,
              timestamp: new Date().toISOString(),
              callId: part.callID || part.id,
              toolName: part.tool,
              output: state.output
            });
          } else if (state?.status === "error") {
            this.emit({
              kind: "agent.tool_result",
              agentId: this.id,
              timestamp: new Date().toISOString(),
              callId: part.callID || part.id,
              toolName: part.tool,
              output: state.error,
              isError: true
            });
          }
        }
        break;
      }

      case "file.edited": {
        this.emit({
          kind: "agent.diff",
          agentId: this.id,
          timestamp: new Date().toISOString(),
          filepath: props.file,
          diffText: `Modified file: ${props.file}`
        });
        break;
      }
    }
  }

  async stop(): Promise<void> {
    if (this.sseAbortController) {
      this.sseAbortController.abort();
      this.sseAbortController = null;
    }

    if (this.client && this.sessionId) {
      try {
        await this.client.session.abort({
          path: { id: this.sessionId }
        });
      } catch {}
    }

    this.setStatus("idle", "Offline");
    this.emit({
      kind: "agent.exit",
      agentId: this.id,
      timestamp: new Date().toISOString(),
      code: 0
    });
  }

  async sendMessage(text: string, options?: SendMessageOptions): Promise<void> {
    if (!this.client || !this.sessionId) {
      throw new Error(`OpenCode session not initialized for ${this.id}`);
    }

    this.setStatus("thinking", "Thinking...");

    const systemPrompt = this.personality
      ? `You are ${this.name}. Persona: ${this.personality}. Workspace: ${this.workingDirectory}.`
      : undefined;

    try {
      await this.client.session.promptAsync({
        path: { id: this.sessionId },
        body: {
          system: systemPrompt,
          parts: [{ type: "text", text }]
        }
      });
    } catch (err: any) {
      console.error(`[OpenCodeRuntime:${this.id}] Error sending message:`, err);
      this.emit({
        kind: "agent.error",
        agentId: this.id,
        timestamp: new Date().toISOString(),
        message: err?.message || "Failed to send message to OpenCode"
      });
      this.setStatus("error", "Message failed");
    }
  }

  async abort(): Promise<void> {
    if (this.client && this.sessionId) {
      try {
        await this.client.session.abort({
          path: { id: this.sessionId }
        });
      } catch (err) {
        console.warn(`[OpenCodeRuntime:${this.id}] Abort error:`, err);
      }
    }
    this.setStatus("available", "Aborted");
    this.postMessage("[Task aborted by user]", "log", "system");
  }

  async reset(options?: RuntimeResetOptions): Promise<void> {
    await this.abort();

    if (this.sseAbortController) {
      this.sseAbortController.abort();
      this.sseAbortController = null;
    }

    if (this.client) {
      const createRes = await this.client.session.create({
        body: {
          title: `${this.name} (${this.id})`
        },
        query: {
          directory: this.workingDirectory
        }
      });
      if (createRes.data) {
        this.sessionId = createRes.data.id;
        this.startEventSubscription();
      }
    }

    this.currentDiffText = null;
    this.setStatus("available", "Ready");

    if (options?.autoIntro) {
      const introPrompt = `Introduce yourself briefly — who you are and what you see in the workspace.`;
      await this.sendMessage(introPrompt, { channel: "task" });
    }
  }

  async getDiff(): Promise<string | null> {
    if (!this.client || !this.sessionId) return null;

    try {
      const diffRes = await this.client.session.diff({
        path: { id: this.sessionId }
      });

      if (diffRes.data && Array.isArray(diffRes.data)) {
        if (diffRes.data.length === 0) return null;
        return diffRes.data
          .map((d: any) => `--- a/${d.file}\n+++ b/${d.file}\n${d.after}`)
          .join("\n\n");
      }
    } catch (err) {
      console.warn(`[OpenCodeRuntime:${this.id}] Diff error:`, err);
    }
    return this.currentDiffText;
  }

  writePty(data: string): void {
    // OpenCode debug console echo
    this.scrollback.push(data);
    this.emit({
      kind: "agent.pty_output",
      agentId: this.id,
      timestamp: new Date().toISOString(),
      data
    });
  }

  resizePty(_cols: number, _rows: number): void {}

  getScrollback(): string[] {
    return [...this.scrollback];
  }

  subscribe(listener: (event: NormalizedAgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
