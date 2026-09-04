import { test, expect } from "@playwright/test";
import path from "path";

const SERVER = "http://localhost:3003";
const TEST_DIR = path.resolve(process.cwd(), "test-workspace-mock");

test.describe("Mock Agent Server Integration", () => {
  test.beforeAll(async () => {
    const { mkdirSync } = await import("fs");
    mkdirSync(TEST_DIR, { recursive: true });
  });

  async function cleanupAgents(request: any) {
    const res = await request.get(`${SERVER}/agents`);
    const agents = await res.json();
    for (const agent of agents) {
      await request.delete(`${SERVER}/agents/${agent.agentId}`);
    }
  }

  test.beforeEach(async ({ request }) => {
    await cleanupAgents(request);
  });

  test.afterEach(async ({ request }) => {
    await cleanupAgents(request);
  });

  test("spawn mock agent, receives auto-intro, replies, and status updates", async ({ request }) => {
    const spawnRes = await request.post(`${SERVER}/agents/spawn`, {
      data: {
        name: "Mock Engineer",
        cliType: "mock",
        provider: "mock",
        workingDirectory: TEST_DIR,
        personality: "Helpful assistant"
      }
    });
    expect(spawnRes.ok()).toBeTruthy();
    const { agentId } = await spawnRes.json();
    expect(agentId).toBeTruthy();

    // Verify agent is in the list
    let agent: any = null;
    for (let i = 0; i < 20; i++) {
      const res = await request.get(`${SERVER}/agents`);
      const list = await res.json();
      agent = list.find((a: any) => a.agentId === agentId);
      if (agent && agent.messages.length > 0) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(agent).toBeTruthy();
    expect(agent.name).toBe("Mock Engineer");
    expect(agent.messages.length).toBeGreaterThanOrEqual(1);
    expect(agent.status).toBe("replied");
    expect(agent.messages[0].text).toContain("Mock Engineer");

    // Send a message asking for a code diff
    const sendRes = await request.post(`${SERVER}/events`, {
      data: {
        type: "agent.message",
        agentId,
        timestamp: new Date().toISOString(),
        payload: { text: "Can you generate a code diff for the feature?", channel: "task" }
      }
    });
    expect(sendRes.ok()).toBeTruthy();

    // Wait for mock reply
    await new Promise((r) => setTimeout(r, 800));

    const updatedRes = await request.get(`${SERVER}/agents`);
    const updatedList = await updatedRes.json();
    const updatedAgent = updatedList.find((a: any) => a.agentId === agentId);

    expect(updatedAgent.messages.length).toBeGreaterThanOrEqual(2);
    expect(updatedAgent.status).toBe("replied");

    // Inspect diff endpoint
    const diffRes = await request.get(`${SERVER}/agents/${agentId}/diff`);
    expect(diffRes.ok()).toBeTruthy();
    const diffData = await diffRes.json();
    expect(diffData.diff).toContain("mockFeature");

    // Abort control
    const abortRes = await request.post(`${SERVER}/agents/${agentId}/control`, {
      data: { command: "abort" }
    });
    expect(abortRes.ok()).toBeTruthy();

    // Reset control
    const resetRes = await request.post(`${SERVER}/agents/${agentId}/control`, {
      data: { command: "reset" }
    });
    expect(resetRes.ok()).toBeTruthy();

    // Delete agent
    const deleteRes = await request.delete(`${SERVER}/agents/${agentId}`);
    expect(deleteRes.ok()).toBeTruthy();

    const finalRes = await request.get(`${SERVER}/agents`);
    const finalList = await finalRes.json();
    expect(finalList.find((a: any) => a.agentId === agentId)).toBeUndefined();
  });
});
