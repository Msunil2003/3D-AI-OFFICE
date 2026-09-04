import { AgentCapabilities } from "@office/runtime-core";
import { BasePtyRuntime } from "./base-pty-runtime";
import * as os from "os";
import * as path from "path";
import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readSync,
  realpathSync,
  statSync
} from "fs";

export const CLAUDE_CAPABILITIES: AgentCapabilities = {
  supportsPty: true,
  supportsTools: true,
  supportsStreaming: true,
  supportsDiff: false,
  supportsAbort: true,
  supportsCustomSystemPrompt: true,
  supportsHeadless: false
};

export class ClaudeRuntime extends BasePtyRuntime {
  readonly provider = "claude-code";

  private jsonlWatcher: NodeJS.Timeout | null = null;
  private jsonlPath: string | null = null;
  private lastJsonlSize = 0;

  getCapabilities(): AgentCapabilities {
    return CLAUDE_CAPABILITIES;
  }

  protected getShellCommand(continueConversation: boolean): string {
    return `claude ${continueConversation ? "--continue " : ""}--dangerously-skip-permissions`;
  }

  private getClaudeProjectDir(): string {
    let resolved: string;
    try {
      resolved = realpathSync(this.workingDirectory);
    } catch {
      resolved = path.resolve(this.workingDirectory);
    }
    const encoded = resolved.replace(/\//g, "-").replace(/ /g, "-");
    return path.join(os.homedir(), ".claude", "projects", encoded);
  }

  protected startFileWatcher(): void {
    const projectDir = this.getClaudeProjectDir();
    console.log(`[jsonl:${this.id}] Watching project dir: ${projectDir}`);

    const existingFileSizes = new Map<string, number>();
    if (existsSync(projectDir)) {
      try {
        readdirSync(projectDir)
          .filter((f) => f.endsWith(".jsonl"))
          .forEach((f) => {
            try {
              existingFileSizes.set(f, statSync(path.join(projectDir, f)).size);
            } catch {}
          });
      } catch {}
    }

    this.jsonlWatcher = setInterval(() => {
      if (!existsSync(projectDir)) return;

      if (!this.jsonlPath) {
        try {
          const currentFiles = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));
          let targetFile = currentFiles.find((f) => !existingFileSizes.has(f));
          let startByte = 0;
          if (!targetFile) {
            for (const f of currentFiles) {
              try {
                const currentSize = statSync(path.join(projectDir, f)).size;
                const prevSize = existingFileSizes.get(f) ?? 0;
                if (currentSize > prevSize) {
                  targetFile = f;
                  startByte = prevSize;
                  break;
                }
              } catch {}
            }
          }
          if (targetFile) {
            this.jsonlPath = path.join(projectDir, targetFile);
            this.lastJsonlSize = startByte;
            console.log(`[jsonl:${this.id}] Locked onto JSONL: ${targetFile} (from byte ${startByte})`);
          }
        } catch {}
        if (!this.jsonlPath) return;
      }

      const jsonlFile = this.jsonlPath;
      let currentSize: number;
      try {
        currentSize = statSync(jsonlFile).size;
      } catch {
        return;
      }
      if (currentSize <= this.lastJsonlSize) return;

      const newBytes = currentSize - this.lastJsonlSize;
      const buffer = Buffer.alloc(newBytes);
      let fd: number;
      try {
        fd = openSync(jsonlFile, "r");
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
          this.processJsonlLine(obj);
        } catch {}
      }
    }, 500);
  }

  private processJsonlLine(obj: any): void {
    if (obj.type === "user" && !this.isBusy) {
      this.isBusy = true;
      if (this.busyUnlockTimer) clearTimeout(this.busyUnlockTimer);
      this.busyUnlockTimer = setTimeout(() => {
        if (this.isBusy) this.isBusy = false;
      }, 60000);

      const userText = Array.isArray(obj.message?.content)
        ? obj.message.content
            .filter((b: any) => b.type === "text" && b.text)
            .map((b: any) => b.text)
            .join("\n")
        : typeof obj.message?.content === "string"
          ? obj.message.content
          : null;

      if (userText && (!this.lastChatMessage || !userText.includes(this.lastChatMessage))) {
        this.postMessage(userText, "task");
      }
      this.lastChatMessage = "";
      this.setStatus("thinking", "Thinking...");
    }

    if (obj.type === "assistant" && obj.message?.content) {
      const textParts: string[] = [];
      for (const block of obj.message.content) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
        }
      }
      if (textParts.length > 0) {
        this.pendingText = textParts.join("\n");
        if (this.settleTimer) clearTimeout(this.settleTimer);
        this.settleTimer = setTimeout(() => this.flushPendingResponse(), 3000);
      }
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
