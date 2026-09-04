import * as pty from "node-pty";
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

const MAX_SCROLLBACK = 5000;

export abstract class BasePtyRuntime implements AgentRuntime {
  readonly id: string;
  readonly name: string;
  abstract readonly provider: string;
  readonly workingDirectory: string;
  readonly personality?: string;

  protected ptyProcess: pty.IPty | null = null;
  protected scrollback: string[] = [];
  protected status: AgentRuntimeStatus = "idle";
  protected listeners = new Set<(event: NormalizedAgentEvent) => void>();
  protected isFirstMessage = true;
  protected isBusy = false;
  protected pendingText = "";
  protected settleTimer: NodeJS.Timeout | null = null;
  protected lastChatMessage = "";
  protected busyUnlockTimer: NodeJS.Timeout | null = null;

  constructor(config: AgentRuntimeConfig) {
    this.id = config.agentId;
    this.name = config.name;
    this.workingDirectory = config.workingDirectory;
    this.personality = config.personality;
  }

  abstract getCapabilities(): AgentCapabilities;
  protected abstract getShellCommand(continueConversation: boolean): string;
  protected abstract startFileWatcher(): void;
  protected abstract stopFileWatcher(): void;

  getStatus(): AgentRuntimeStatus {
    return this.status;
  }

  protected emit(event: NormalizedAgentEvent) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[${this.provider}:${this.id}] Listener error:`, err);
      }
    }
  }

  protected setStatus(status: AgentRuntimeStatus, summary: string, detail?: string) {
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

  protected postMessage(
    text: string,
    channel: "log" | "reply" | "task" | "system",
    author = this.name,
    collapsible?: boolean
  ) {
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

  protected spawnPty(continueConversation: boolean): boolean {
    const shellCmd = this.getShellCommand(continueConversation);
    const cleanEnv = { ...process.env };
    delete cleanEnv.CLAUDECODE;

    const isWin = process.platform === "win32";
    const shell = isWin
      ? process.env.COMSPEC || "cmd.exe"
      : process.env.SHELL || "/bin/bash";
    const shellArgs = isWin ? ["/c", shellCmd] : ["-l", "-c", shellCmd];

    try {
      this.ptyProcess = pty.spawn(shell, shellArgs, {
        name: "xterm-256color",
        cols: 120,
        rows: 40,
        cwd: this.workingDirectory,
        env: cleanEnv as Record<string, string>
      });
    } catch (err) {
      console.error(`[pty:${this.id}] Failed to spawn:`, err);
      return false;
    }

    console.log(`[pty:${this.id}] Spawned (pid: ${this.ptyProcess.pid}) in ${this.workingDirectory}`);

    this.ptyProcess.onData((data: string) => {
      this.scrollback.push(data);
      if (this.scrollback.length > MAX_SCROLLBACK) {
        this.scrollback.splice(0, this.scrollback.length - MAX_SCROLLBACK);
      }
      this.emit({
        kind: "agent.pty_output",
        agentId: this.id,
        timestamp: new Date().toISOString(),
        data
      });
    });

    this.ptyProcess.onExit(({ exitCode }) => {
      console.log(`[pty:${this.id}] PTY exited with code ${exitCode}`);
      this.stopFileWatcher();
      if (this.settleTimer) clearTimeout(this.settleTimer);
      if (this.busyUnlockTimer) clearTimeout(this.busyUnlockTimer);
      this.emit({
        kind: "agent.exit",
        agentId: this.id,
        timestamp: new Date().toISOString(),
        code: exitCode
      });
    });

    this.startFileWatcher();
    return true;
  }

  async start(options?: RuntimeStartOptions): Promise<void> {
    const ok = this.spawnPty(!!options?.continueConversation);
    if (!ok) {
      throw new Error(`Failed to spawn PTY process for agent ${this.name} (${this.id})`);
    }

    this.setStatus("available", "Ready");

    if (options?.autoIntro) {
      this.scheduleAutoIntro();
    }
  }

  protected scheduleAutoIntro() {
    let sent = false;
    const readyCheck = setInterval(() => {
      if (sent) {
        clearInterval(readyCheck);
        return;
      }
      if (this.scrollback.length > 0) {
        sent = true;
        clearInterval(readyCheck);
        setTimeout(() => {
          this.sendMessage("Introduce yourself briefly — who you are and what you see in the workspace.", {
            channel: "task"
          });
        }, 1000);
      }
    }, 500);

    setTimeout(() => {
      if (!sent) {
        sent = true;
        clearInterval(readyCheck);
        this.sendMessage("Introduce yourself briefly — who you are and what you see in the workspace.", {
          channel: "task"
        });
      }
    }, 8000);
  }

  async stop(): Promise<void> {
    this.stopFileWatcher();
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.busyUnlockTimer) clearTimeout(this.busyUnlockTimer);
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch {}
      this.ptyProcess = null;
    }
    this.setStatus("idle", "Offline");
  }

  async sendMessage(text: string, options?: SendMessageOptions): Promise<void> {
    if (!this.ptyProcess) {
      const ok = this.spawnPty(true);
      if (!ok) return;
    }

    if (this.isBusy) {
      console.log(`[chat→pty:${this.id}] Agent is busy, skipping`);
      return;
    }

    let prompt = text;
    if (this.isFirstMessage) {
      const personalityLine = this.personality ? ` Your personality: ${this.personality}.` : "";
      const context = [
        `You're joining a virtual office simulation where AI agents work alongside humans.`,
        `Think of it like a cozy pixel-art coworking space where each agent has their own desk, personality, and expertise.`,
        `Your identity in this office: "${this.name}".`,
        `Your workspace: ${this.workingDirectory}.`,
        personalityLine,
        `Embrace being ${this.name} — it's your persona here.`,
        `When asked who you are, you're ${this.name}, a sharp and helpful coworker who's genuinely invested in the project.`,
        `You're not an assistant floating in the void; you're a colleague sitting at the desk next to mine.`,
        `Keep it natural: be warm, be direct, have opinions.`,
        `Say "boss" casually like a friend would, not formally.`,
        `Think brilliant coworker energy — someone who's excited to dig into problems, pushes back when something seems off, and celebrates wins together.`,
        `Let's get to work.`
      ]
        .filter(Boolean)
        .join(" ");
      prompt = context + " " + text;
      this.isFirstMessage = false;
    }

    this.lastChatMessage = text;

    // Send Ctrl+U to clear stale input, then write prompt and submit
    this.ptyProcess?.write("\x15");
    setTimeout(() => {
      this.ptyProcess?.write(prompt);
      setTimeout(() => this.ptyProcess?.write("\r"), 500);
    }, 100);

    this.isBusy = true;
    if (this.busyUnlockTimer) clearTimeout(this.busyUnlockTimer);
    this.busyUnlockTimer = setTimeout(() => {
      if (this.isBusy) {
        console.log(`[chat→pty:${this.id}] Busy timeout — forcing unlock`);
        this.isBusy = false;
        this.setStatus("available", "Ready");
      }
    }, 60000);

    this.setStatus("thinking", "Thinking...");
  }

  async abort(): Promise<void> {
    if (this.ptyProcess) {
      this.ptyProcess.write("\x03"); // Ctrl+C
    }
    this.isBusy = false;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.busyUnlockTimer) clearTimeout(this.busyUnlockTimer);
    this.setStatus("available", "Aborted");
    this.postMessage("[Task aborted by user]", "log", "system");
  }

  async reset(options?: RuntimeResetOptions): Promise<void> {
    await this.stop();
    this.scrollback = [];
    this.isFirstMessage = true;
    this.isBusy = false;
    this.pendingText = "";
    this.lastChatMessage = "";

    const ok = this.spawnPty(false);
    if (ok) {
      this.setStatus("available", "Ready");
      if (options?.autoIntro !== false) {
        this.scheduleAutoIntro();
      }
    }
  }

  writePty(data: string): void {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resizePty(cols: number, rows: number): void {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
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

  protected flushPendingResponse(): void {
    if (!this.pendingText) return;

    const text = this.pendingText.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f]/g, "").trim();
    this.pendingText = "";
    this.settleTimer = null;
    this.isBusy = false;
    if (this.busyUnlockTimer) clearTimeout(this.busyUnlockTimer);

    if (!text) return;

    console.log(`[flush:${this.id}] Flushing response (${text.length} chars)`);
    this.postMessage(text, "reply");
    this.setStatus("replied", "New message");
  }
}
