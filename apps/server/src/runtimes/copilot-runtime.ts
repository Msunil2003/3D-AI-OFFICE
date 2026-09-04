import { AgentCapabilities } from "@office/runtime-core";
import { BasePtyRuntime } from "./base-pty-runtime";
import * as os from "os";
import * as path from "path";
import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  statSync
} from "fs";

export const COPILOT_CAPABILITIES: AgentCapabilities = {
  supportsPty: true,
  supportsTools: true,
  supportsStreaming: true,
  supportsDiff: false,
  supportsAbort: true,
  supportsCustomSystemPrompt: true,
  supportsHeadless: false
};

export class CopilotRuntime extends BasePtyRuntime {
  readonly provider = "copilot-cli";

  private jsonlWatcher: NodeJS.Timeout | null = null;
  private jsonlPath: string | null = null;
  private lastJsonlSize = 0;

  getCapabilities(): AgentCapabilities {
    return COPILOT_CAPABILITIES;
  }

  protected getShellCommand(continueConversation: boolean): string {
    return `copilot ${continueConversation ? "--resume " : ""}--allow-all`;
  }

  private getCopilotSessionDir(): string {
    return path.join(os.homedir(), ".copilot", "session-state");
  }

  protected startFileWatcher(): void {
    const sessionStateDir = this.getCopilotSessionDir();
    console.log(`[copilot-jsonl:${this.id}] Watching for session in ${sessionStateDir}`);

    this.jsonlWatcher = setInterval(() => {
      if (!existsSync(sessionStateDir)) return;

      if (this.jsonlPath) {
        let currentSize: number;
        try {
          currentSize = statSync(this.jsonlPath).size;
        } catch {
          return;
        }
        if (currentSize <= this.lastJsonlSize) return;

        const newBytes = currentSize - this.lastJsonlSize;
        const buffer = Buffer.alloc(newBytes);
        try {
          const fd = openSync(this.jsonlPath, "r");
          readSync(fd, buffer, 0, newBytes, this.lastJsonlSize);
          closeSync(fd);
        } catch {
          return;
        }

        const newContent = buffer.toString("utf-8");
        const parts = newContent.split("\n");
        const hasTrailingNewline = newContent.endsWith("\n");
        const completeLines = hasTrailingNewline
          ? parts.filter((l) => l.trim())
          : parts.slice(0, -1).filter((l) => l.trim());
        const incompletePart = hasTrailingNewline ? "" : parts[parts.length - 1] || "";
        this.lastJsonlSize = currentSize - Buffer.byteLength(incompletePart, "utf-8");

        for (const line of completeLines) {
          try {
            const obj = JSON.parse(line);
            this.processCopilotJsonlLine(obj);
          } catch {}
        }
        return;
      }

      // Look for session directory matching cwd
      try {
        const currentDirs = readdirSync(sessionStateDir);
        const dirsByMtime = currentDirs
          .map((d) => {
            try {
              return { name: d, mtime: statSync(path.join(sessionStateDir, d)).mtimeMs };
            } catch {
              return { name: d, mtime: 0 };
            }
          })
          .sort((a, b) => b.mtime - a.mtime);

        for (const { name: dir } of dirsByMtime) {
          const wsYaml = path.join(sessionStateDir, dir, "workspace.yaml");
          const eventsJsonl = path.join(sessionStateDir, dir, "events.jsonl");
          if (!existsSync(wsYaml) || !existsSync(eventsJsonl)) continue;

          try {
            const yaml = readFileSync(wsYaml, "utf-8");
            const cwdMatch = yaml.match(/^cwd:\s*(.+)$/m);
            if (cwdMatch && cwdMatch[1].trim() === this.workingDirectory) {
              const yamlStat = statSync(wsYaml);
              const ageMs = Date.now() - yamlStat.mtimeMs;
              if (ageMs < 30000) {
                this.jsonlPath = eventsJsonl;
                this.lastJsonlSize = 0;
                console.log(`[copilot-jsonl:${this.id}] Locked onto session: ${dir}`);
                break;
              }
            }
          } catch {}
        }
      } catch {}
    }, 500);
  }

  private processCopilotJsonlLine(obj: any): void {
    if (obj.type === "user.message" && !this.isBusy) {
      this.isBusy = true;
      if (this.busyUnlockTimer) clearTimeout(this.busyUnlockTimer);
      this.busyUnlockTimer = setTimeout(() => {
        if (this.isBusy) this.isBusy = false;
      }, 60000);

      const userText = obj.data?.content;
      if (
        userText &&
        typeof userText === "string" &&
        (!this.lastChatMessage || !userText.includes(this.lastChatMessage))
      ) {
        this.postMessage(userText, "task");
      }
      this.lastChatMessage = "";
      this.setStatus("thinking", "Thinking...");
    }

    if (obj.type === "assistant.message") {
      const text = obj.data?.content;
      if (text && typeof text === "string") {
        this.pendingText = text;
        if (this.settleTimer) clearTimeout(this.settleTimer);
        this.settleTimer = setTimeout(() => this.flushPendingResponse(), 3000);
      }
    }

    if (obj.type === "assistant.turn_end" && this.pendingText) {
      if (this.settleTimer) clearTimeout(this.settleTimer);
      this.flushPendingResponse();
    }
  }

  protected stopFileWatcher(): void {
    if (this.jsonlWatcher) {
      clearInterval(this.jsonlWatcher);
      this.jsonlWatcher = null;
    }
    this.jsonlPath = null;
    this.lastJsonlSize = 0;
  }
}
