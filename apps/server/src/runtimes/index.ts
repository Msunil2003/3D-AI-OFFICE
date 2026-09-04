import {
  defaultRuntimeRegistry,
  MockRuntime,
  MOCK_CAPABILITIES
} from "@office/runtime-core";
import {
  OpenCodeRuntime,
  OPENCODE_CAPABILITIES
} from "@office/runtime-opencode";
import { ClaudeRuntime, CLAUDE_CAPABILITIES } from "./claude-runtime";
import { CopilotRuntime, COPILOT_CAPABILITIES } from "./copilot-runtime";

export * from "./base-pty-runtime";
export * from "./claude-runtime";
export * from "./copilot-runtime";

// Register all providers in the default registry
defaultRuntimeRegistry.registerProvider(
  "mock",
  (config) => new MockRuntime(config),
  MOCK_CAPABILITIES
);

defaultRuntimeRegistry.registerProvider(
  "claude-code",
  (config) => new ClaudeRuntime(config),
  CLAUDE_CAPABILITIES
);

defaultRuntimeRegistry.registerProvider(
  "copilot-cli",
  (config) => new CopilotRuntime(config),
  COPILOT_CAPABILITIES
);

defaultRuntimeRegistry.registerProvider(
  "opencode",
  (config) => new OpenCodeRuntime(config),
  OPENCODE_CAPABILITIES
);

export { defaultRuntimeRegistry };
