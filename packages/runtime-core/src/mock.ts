import {
  AgentCapabilities,
  AgentRuntime,
  AgentRuntimeConfig,
  AgentRuntimeStatus,
  NormalizedAgentEvent,
  RuntimeResetOptions,
  RuntimeStartOptions,
  SendMessageOptions
} from "./types";

export const MOCK_CAPABILITIES: AgentCapabilities = {
  supportsPty: true,
  supportsTools: true,
  supportsStreaming: true,
  supportsDiff: true,
  supportsAbort: true,
  supportsCustomSystemPrompt: true,
  supportsHeadless: true
};

export class MockRuntime implements AgentRuntime {
  readonly id: string;
  readonly name: string;
  readonly provider: string = "mock";
  readonly workingDirectory: string;
  readonly personality?: string;

  private status: AgentRuntimeStatus = "idle";
  private listeners = new Set<(event: NormalizedAgentEvent) => void>();
  private timers: NodeJS.Timeout[] = [];
  private scrollback: string[] = [];
  private currentDiff: string | null = null;
  private ptyBuffer = "";

  constructor(config: AgentRuntimeConfig) {
    this.id = config.agentId;
    this.name = config.name;
    this.workingDirectory = config.workingDirectory;
    this.personality = config.personality;

    this.scrollback.push(`\x1b[36m[MockRuntime]\x1b[0m Initialized for ${this.name} (${this.id})\r\n`);
  }

  getCapabilities(): AgentCapabilities {
    return MOCK_CAPABILITIES;
  }

  getStatus(): AgentRuntimeStatus {
    return this.status;
  }

  private emit(event: NormalizedAgentEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[MockRuntime:${this.id}] Error in event listener:`, err);
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

  private postMessage(text: string, channel: "log" | "reply" | "task" | "system", author = this.name) {
    this.emit({
      kind: "agent.message",
      agentId: this.id,
      timestamp: new Date().toISOString(),
      text,
      channel,
      author
    });
  }

  async start(options?: RuntimeStartOptions): Promise<void> {
    this.setStatus("available", "Ready");
    this.appendPty(`\x1b[32m[MockRuntime]\x1b[0m Agent ${this.name} started in ${this.workingDirectory}\r\n$ `);

    if (options?.autoIntro) {
      this.setStatus("thinking", "Introducing myself...");
      const timer = setTimeout(() => {
        const personalityNote = this.personality ? ` (${this.personality})` : "";
        const intro = `Hello! I'm ${this.name}${personalityNote}. I'm ready to work in ${this.workingDirectory}.`;
        this.postMessage(intro, "reply");
        this.setStatus("replied", "New message");
        this.appendPty(`[Agent]: ${intro}\r\n$ `);
      }, 400);
      this.timers.push(timer);
    }
  }

  async stop(): Promise<void> {
    this.clearTimers();
    this.setStatus("idle", "Offline");
    this.appendPty(`\x1b[33m[MockRuntime]\x1b[0m Agent stopped\r\n`);
    this.emit({
      kind: "agent.exit",
      agentId: this.id,
      timestamp: new Date().toISOString(),
      code: 0
    });
  }

  async sendMessage(text: string, _options?: SendMessageOptions): Promise<void> {
    this.setStatus("thinking", "Thinking...");
    this.appendPty(`\x1b[90m> ${text}\x1b[0m\r\n`);

    const timer = setTimeout(() => {
      if (text.toLowerCase().includes("error")) {
        this.emit({
          kind: "agent.error",
          agentId: this.id,
          timestamp: new Date().toISOString(),
          message: "Simulated error during task processing",
          code: "MOCK_ERROR"
        });
        this.setStatus("error", "Error occurred");
        this.appendPty(`\x1b[31m[Error] Simulated error processing request\x1b[0m\r\n$ `);
        return;
      }

      if (text.toLowerCase().includes("diff") || text.toLowerCase().includes("code")) {
        // Simulate tool call + diff
        this.emit({
          kind: "agent.tool_call",
          agentId: this.id,
          timestamp: new Date().toISOString(),
          callId: `call-${Date.now()}`,
          toolName: "edit_file",
          input: { file: "src/feature.ts", action: "create" }
        });

        this.currentDiff = [
          "--- a/src/feature.ts",
          "+++ b/src/feature.ts",
          "@@ -0,0 +1,5 @@",
          "+export function mockFeature() {",
          "+  return 'Hello from 3D AI Office';",
          "+}"
        ].join("\n");

        this.emit({
          kind: "agent.diff",
          agentId: this.id,
          timestamp: new Date().toISOString(),
          filepath: "src/feature.ts",
          diffText: this.currentDiff,
          added: 4,
          removed: 0
        });

        const reply = `I've prepared the changes in \`src/feature.ts\`:\n\n\`\`\`typescript\nexport function mockFeature() {\n  return 'Hello from 3D AI Office';\n}\n\`\`\``;
        this.postMessage(reply, "reply");
        this.setStatus("replied", "Changes proposed");
        this.appendPty(`[Tool]: edit_file src/feature.ts\r\n[Agent]: Changes proposed\r\n$ `);
        return;
      }

      // Standard reply
      const reply = `Received: "${text}". Everything is looking great at desk ${this.name}!`;
      this.postMessage(reply, "reply");
      this.setStatus("replied", "New message");
      this.appendPty(`[Agent]: ${reply}\r\n$ `);
    }, 500);

    this.timers.push(timer);
  }

  async abort(): Promise<void> {
    this.clearTimers();
    this.setStatus("available", "Aborted");
    this.postMessage("[Operation aborted by user]", "log", "system");
    this.appendPty(`\x1b[33m^C [Aborted]\x1b[0m\r\n$ `);
  }

  async reset(options?: RuntimeResetOptions): Promise<void> {
    this.clearTimers();
    this.currentDiff = null;
    this.scrollback = [`\x1b[36m[MockRuntime]\x1b[0m Session reset.\r\n`];
    this.setStatus("available", "Ready");

    if (options?.autoIntro) {
      const timer = setTimeout(() => {
        const intro = `Fresh session started! How can I assist you now?`;
        this.postMessage(intro, "reply");
        this.setStatus("replied", "New message");
        this.appendPty(`[Agent]: ${intro}\r\n$ `);
      }, 400);
      this.timers.push(timer);
    }
  }

  async getDiff(): Promise<string | null> {
    return this.currentDiff;
  }

  writePty(data: string): void {
    this.ptyBuffer += data;
    if (data === "\r" || data === "\n") {
      const line = this.ptyBuffer.trim();
      this.ptyBuffer = "";
      this.appendPty(`\r\n\x1b[32m[echo]:\x1b[0m ${line}\r\n$ `);
    } else if (data === "\x03") { // Ctrl+C
      this.ptyBuffer = "";
      this.abort();
    } else {
      this.appendPty(data);
    }
  }

  resizePty(_cols: number, _rows: number): void {
    // No-op for simulated mock
  }

  getScrollback(): string[] {
    return [...this.scrollback];
  }

  subscribe(listener: (event: NormalizedAgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private appendPty(data: string) {
    this.scrollback.push(data);
    if (this.scrollback.length > 2000) {
      this.scrollback.splice(0, this.scrollback.length - 2000);
    }
    this.emit({
      kind: "agent.pty_output",
      agentId: this.id,
      timestamp: new Date().toISOString(),
      data
    });
  }

  private clearTimers() {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers = [];
  }
}
