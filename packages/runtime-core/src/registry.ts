import {
  AgentCapabilities,
  AgentRuntime,
  AgentRuntimeConfig
} from "./types.js";

export type RuntimeFactory = (config: AgentRuntimeConfig) => AgentRuntime | Promise<AgentRuntime>;

export class RuntimeRegistry {
  private factories = new Map<string, RuntimeFactory>();
  private capabilities = new Map<string, AgentCapabilities>();
  private activeRuntimes = new Map<string, AgentRuntime>();

  registerProvider(
    provider: string,
    factory: RuntimeFactory,
    capabilities: AgentCapabilities
  ): void {
    this.factories.set(provider, factory);
    this.capabilities.set(provider, capabilities);
  }

  getProviderCapabilities(provider: string): AgentCapabilities | undefined {
    return this.capabilities.get(provider);
  }

  getSupportedProviders(): string[] {
    return Array.from(this.factories.keys());
  }

  async createRuntime(config: AgentRuntimeConfig): Promise<AgentRuntime> {
    const factory = this.factories.get(config.provider);
    if (!factory) {
      throw new Error(
        `Unknown agent provider: "${config.provider}". Supported: [${this.getSupportedProviders().join(", ")}]`
      );
    }

    // If an existing runtime with this ID exists, stop and clean it up first
    const existing = this.activeRuntimes.get(config.agentId);
    if (existing) {
      try {
        await existing.stop();
      } catch (err) {
        console.warn(`[RuntimeRegistry] Error stopping previous runtime for ${config.agentId}:`, err);
      }
      this.activeRuntimes.delete(config.agentId);
    }

    const runtime = await factory(config);
    this.activeRuntimes.set(config.agentId, runtime);
    return runtime;
  }

  getRuntime(agentId: string): AgentRuntime | undefined {
    return this.activeRuntimes.get(agentId);
  }

  getAllRuntimes(): AgentRuntime[] {
    return Array.from(this.activeRuntimes.values());
  }

  hasRuntime(agentId: string): boolean {
    return this.activeRuntimes.has(agentId);
  }

  async removeRuntime(agentId: string): Promise<boolean> {
    const runtime = this.activeRuntimes.get(agentId);
    if (!runtime) return false;
    try {
      await runtime.stop();
    } catch (err) {
      console.warn(`[RuntimeRegistry] Error stopping runtime for ${agentId}:`, err);
    }
    return this.activeRuntimes.delete(agentId);
  }

  clear(): void {
    this.activeRuntimes.clear();
  }
}

export const defaultRuntimeRegistry = new RuntimeRegistry();
