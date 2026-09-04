import { test, expect } from "@playwright/test";
import {
  MockRuntime,
  MOCK_CAPABILITIES
} from "../packages/runtime-core/src/index";
import { defaultRuntimeRegistry } from "../apps/server/src/runtimes/index";
import {
  OpenCodeRuntime,
  OPENCODE_CAPABILITIES
} from "../packages/runtimes/opencode/src/index";
import {
  ClaudeRuntime,
  CLAUDE_CAPABILITIES
} from "../apps/server/src/runtimes/claude-runtime";
import {
  CopilotRuntime,
  COPILOT_CAPABILITIES
} from "../apps/server/src/runtimes/copilot-runtime";

test.describe("Runtime Abstraction & MockRuntime", () => {
  test("MockRuntime capabilities and discovery", () => {
    const runtime = new MockRuntime({
      agentId: "mock-test-1",
      name: "MockDev",
      provider: "mock",
      workingDirectory: process.cwd()
    });

    const caps = runtime.getCapabilities();
    expect(caps.supportsPty).toBe(true);
    expect(caps.supportsTools).toBe(true);
    expect(caps.supportsStreaming).toBe(true);
    expect(caps.supportsDiff).toBe(true);
    expect(caps.supportsAbort).toBe(true);
    expect(caps.supportsHeadless).toBe(true);
    expect(runtime.getStatus()).toBe("idle");
  });

  test("MockRuntime start with autoIntro emits status and message events", async () => {
    const runtime = new MockRuntime({
      agentId: "mock-test-2",
      name: "MockArchitect",
      provider: "mock",
      workingDirectory: process.cwd(),
      personality: "Pragmatic builder"
    });

    const events: any[] = [];
    const unsubscribe = runtime.subscribe((ev) => events.push(ev));

    await runtime.start({ autoIntro: true });

    // Wait for simulated intro delay (400ms)
    await new Promise((r) => setTimeout(r, 600));

    expect(events.length).toBeGreaterThanOrEqual(2);
    const statusEvents = events.filter((e) => e.kind === "agent.status");
    const msgEvents = events.filter((e) => e.kind === "agent.message");

    expect(statusEvents.some((s) => s.status === "available")).toBe(true);
    expect(statusEvents.some((s) => s.status === "replied")).toBe(true);
    expect(msgEvents.length).toBeGreaterThanOrEqual(1);
    expect(msgEvents[0].text).toContain("MockArchitect");

    unsubscribe();
    await runtime.stop();
  });

  test("MockRuntime chat, tool call, and diff streaming", async () => {
    const runtime = new MockRuntime({
      agentId: "mock-test-3",
      name: "MockCoder",
      provider: "mock",
      workingDirectory: process.cwd()
    });

    const events: any[] = [];
    runtime.subscribe((ev) => events.push(ev));
    await runtime.start({ autoIntro: false });

    // Send a message asking for code / diff
    await runtime.sendMessage("Please create the code diff for this feature");

    // Wait for simulated thinking & reply
    await new Promise((r) => setTimeout(r, 700));

    const toolEvents = events.filter((e) => e.kind === "agent.tool_call");
    const diffEvents = events.filter((e) => e.kind === "agent.diff");
    const replyEvents = events.filter((e) => e.kind === "agent.message" && e.channel === "reply");

    expect(toolEvents.length).toBe(1);
    expect(toolEvents[0].toolName).toBe("edit_file");

    expect(diffEvents.length).toBe(1);
    expect(diffEvents[0].filepath).toBe("src/feature.ts");

    const diff = await runtime.getDiff();
    expect(diff).toContain("export function mockFeature()");

    expect(replyEvents.length).toBe(1);
    expect(replyEvents[0].text).toContain("src/feature.ts");

    await runtime.stop();
  });

  test("MockRuntime abort resets status and posts log message", async () => {
    const runtime = new MockRuntime({
      agentId: "mock-test-4",
      name: "MockAborter",
      provider: "mock",
      workingDirectory: process.cwd()
    });

    const events: any[] = [];
    runtime.subscribe((ev) => events.push(ev));
    await runtime.start({ autoIntro: false });

    runtime.sendMessage("Long running process");
    expect(runtime.getStatus()).toBe("thinking");

    await runtime.abort();
    expect(runtime.getStatus()).toBe("available");

    const abortMsg = events.find(
      (e) => e.kind === "agent.message" && e.text.includes("[Operation aborted by user]")
    );
    expect(abortMsg).toBeTruthy();

    await runtime.stop();
  });

  test("MockRuntime reset clears diff and resets state", async () => {
    const runtime = new MockRuntime({
      agentId: "mock-test-5",
      name: "MockResetter",
      provider: "mock",
      workingDirectory: process.cwd()
    });

    await runtime.start({ autoIntro: false });
    await runtime.sendMessage("Generate diff");
    await new Promise((r) => setTimeout(r, 700));

    expect(await runtime.getDiff()).not.toBeNull();

    await runtime.reset({ autoIntro: false });
    expect(await runtime.getDiff()).toBeNull();
    expect(runtime.getStatus()).toBe("available");

    await runtime.stop();
  });

  test("RuntimeRegistry registers and creates providers", async () => {
    const providers = defaultRuntimeRegistry.getSupportedProviders();
    expect(providers).toContain("mock");
    expect(providers).toContain("claude-code");
    expect(providers).toContain("copilot-cli");
    expect(providers).toContain("opencode");

    const runtime = await defaultRuntimeRegistry.createRuntime({
      agentId: "reg-test-1",
      name: "RegistryAgent",
      provider: "mock",
      workingDirectory: process.cwd()
    });

    expect(runtime).toBeInstanceOf(MockRuntime);
    expect(defaultRuntimeRegistry.hasRuntime("reg-test-1")).toBe(true);
    expect(defaultRuntimeRegistry.getRuntime("reg-test-1")).toBe(runtime);

    const removed = await defaultRuntimeRegistry.removeRuntime("reg-test-1");
    expect(removed).toBe(true);
    expect(defaultRuntimeRegistry.hasRuntime("reg-test-1")).toBe(false);
  });

  test("OpenCodeRuntime capabilities and configuration", () => {
    const runtime = new OpenCodeRuntime({
      agentId: "opencode-test-1",
      name: "OpenCodeDev",
      provider: "opencode",
      workingDirectory: process.cwd()
    });

    const caps = runtime.getCapabilities();
    expect(caps.supportsPty).toBe(false);
    expect(caps.supportsTools).toBe(true);
    expect(caps.supportsStreaming).toBe(true);
    expect(caps.supportsDiff).toBe(true);
    expect(caps.supportsAbort).toBe(true);
    expect(caps.supportsHeadless).toBe(true);
    expect(runtime.provider).toBe("opencode");
  });

  test("ClaudeRuntime and CopilotRuntime capabilities", () => {
    const claude = new ClaudeRuntime({
      agentId: "claude-cap-test",
      name: "Claude",
      provider: "claude-code",
      workingDirectory: process.cwd()
    });
    expect(claude.getCapabilities().supportsPty).toBe(true);
    expect(claude.provider).toBe("claude-code");

    const copilot = new CopilotRuntime({
      agentId: "copilot-cap-test",
      name: "Copilot",
      provider: "copilot-cli",
      workingDirectory: process.cwd()
    });
    expect(copilot.getCapabilities().supportsPty).toBe(true);
    expect(copilot.provider).toBe("copilot-cli");
  });
});
