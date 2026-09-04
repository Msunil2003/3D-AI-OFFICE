import type { OpencodeClient } from "@opencode-ai/sdk";

async function getSdk() {
  return await import("@opencode-ai/sdk");
}

export interface OpenCodeServerConfig {
  hostname?: string;
  port?: number;
  existingServerUrl?: string;
  timeout?: number;
}

export interface ManagedServerInstance {
  url: string;
  client: OpencodeClient;
  isExternal: boolean;
  close: () => Promise<void>;
}

export class OpenCodeServerManager {
  private instance: ManagedServerInstance | null = null;
  private startPromise: Promise<ManagedServerInstance> | null = null;

  async getServer(config: OpenCodeServerConfig = {}): Promise<ManagedServerInstance> {
    if (this.instance) {
      return this.instance;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = this.initServer(config);
    try {
      this.instance = await this.startPromise;
      return this.instance;
    } finally {
      this.startPromise = null;
    }
  }

  private async initServer(config: OpenCodeServerConfig): Promise<ManagedServerInstance> {
    const { createOpencodeServer, createOpencodeClient } = await getSdk();
    const urlFromEnv = process.env.OPENCODE_SERVER_URL || config.existingServerUrl;
    if (urlFromEnv) {
      console.log(`[OpenCodeServerManager] Connecting to existing OpenCode server at ${urlFromEnv}`);
      const client = createOpencodeClient({
        baseUrl: urlFromEnv as `${string}://${string}`
      });
      return {
        url: urlFromEnv,
        client,
        isExternal: true,
        close: async () => {
          // No-op for external server
        }
      };
    }

    console.log(`[OpenCodeServerManager] Spawning headless OpenCode server...`);
    const serverObj = await createOpencodeServer({
      hostname: config.hostname ?? "127.0.0.1",
      port: config.port ?? 0,
      timeout: config.timeout ?? 10000
    });

    console.log(`[OpenCodeServerManager] OpenCode server started at ${serverObj.url}`);
    const client = createOpencodeClient({
      baseUrl: serverObj.url as `${string}://${string}`
    });

    return {
      url: serverObj.url,
      client,
      isExternal: false,
      close: async () => {
        try {
          serverObj.close();
          console.log(`[OpenCodeServerManager] OpenCode server closed`);
        } catch (err) {
          console.warn(`[OpenCodeServerManager] Error closing server:`, err);
        }
      }
    };
  }

  async stop(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
  }

  getClient(): OpencodeClient | null {
    return this.instance?.client ?? null;
  }

  getUrl(): string | null {
    return this.instance?.url ?? null;
  }
}

export const defaultOpenCodeServerManager = new OpenCodeServerManager();
