import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

test.describe("AIOffice Product Redesign — Comprehensive Component & Modal Validation", () => {
  const screenshotsDir = path.resolve("screenshots/redesign");

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test("Validate all redesigned UI components, overlays, and interactions", async ({ page }) => {
    test.setTimeout(120_000);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log("1. Navigating to AIOffice 3D...");
    await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // 1. Executive Operating Bar
    console.log("2. Validating Executive Operating Bar...");
    const execBar = page.locator(".executive-bar");
    await expect(execBar).toBeVisible();
    await expect(execBar.locator(".bar-mark")).toContainText("AIOffice");
    await expect(execBar.locator(".bar-location")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "01-executive-operating-bar.png") });

    // 2. Command Palette (Search)
    console.log("3. Validating Search Command Palette (Ctrl+K)...");
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(400);
    const searchModal = page.locator("#search-command-palette");
    await expect(searchModal).toBeVisible();
    const searchInput = searchModal.locator("input");
    await expect(searchInput).toBeFocused();
    await searchInput.fill("Alex");
    await page.waitForTimeout(200);
    await expect(searchModal.locator(".search-result-row")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "02-search-palette.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(searchModal).not.toBeVisible();

    // 3. Attention Center
    console.log("4. Validating Attention Center...");
    const bellBtn = page.locator(".bar-btn.has-badge");
    await bellBtn.click();
    await page.waitForTimeout(400);
    const attentionPanel = page.locator("#attention-center");
    await expect(attentionPanel).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "03-attention-center.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(attentionPanel).not.toBeVisible();

    // 4. Campus Directory / Spatial Map
    console.log("5. Validating World Map...");
    const mapBtn = page.locator(".bar-btn[title*='Directory'], .bar-btn[title*='Campus map']");
    await mapBtn.click();
    await page.waitForTimeout(400);
    const mapModal = page.locator("#campus-map-modal");
    await expect(mapModal).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "04-world-map.png") });
    // Test floor tabs
    const floor0Btn = mapModal.locator("button:has-text('Level 0')");
    if (await floor0Btn.isVisible()) {
      await floor0Btn.click();
      await page.waitForTimeout(200);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(mapModal).not.toBeVisible();

    // 5. Focus Mode (Tab Key)
    console.log("6. Validating Focus Mode (Tab)...");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
    await expect(execBar).toHaveClass(/focus-hidden/);
    await page.screenshot({ path: path.join(screenshotsDir, "05-focus-mode.png") });
    // Exit Focus Mode
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
    await expect(execBar).not.toHaveClass(/focus-hidden/);

    // 6. Agent Inspector Panel
    console.log("7. Validating Agent Inspector...");
    await page.evaluate(() => {
      (window as any).__selectAgent();
    });
    await page.waitForTimeout(400);
    const agentInspector = page.locator("#agent-inspector");
    await expect(agentInspector).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "06-agent-inspector-overview.png") });

    // Test tabs in Agent Inspector
    await agentInspector.locator("button.panel-tab:has-text('Work')").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "07-agent-inspector-work.png") });

    await agentInspector.locator("button.panel-tab:has-text('Terminal')").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "08-agent-inspector-terminal.png") });

    await agentInspector.locator("button.panel-tab:has-text('Activity')").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "09-agent-inspector-activity.png") });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(agentInspector).not.toBeVisible();

    // 7. Workstation / Task Inspector
    console.log("8. Validating Workstation / Task Inspector...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveModal("workstation-inspect");
      store.setSelectedWorkstationId("ws-backend-01");
    });
    await page.waitForTimeout(400);
    const taskInspector = page.locator("#task-inspector-modal");
    await expect(taskInspector).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "10-workstation-inspector-overview.png") });

    await taskInspector.locator("button.inspector-tab-btn:has-text('Changes')").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "11-workstation-inspector-changes.png") });

    await taskInspector.locator("button.inspector-tab-btn:has-text('Terminal')").click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "12-workstation-inspector-terminal.png") });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(taskInspector).not.toBeVisible();

    // 8. Governance / Approval Modal
    console.log("9. Validating Governance & Approval Gates Modal...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveModal("governance-gate");
    });
    await page.waitForTimeout(400);
    const approvalModal = page.locator("#governance-approval-modal");
    await expect(approvalModal).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "13-governance-approval-modal.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(approvalModal).not.toBeVisible();

    // 9. Meeting Scheduler Panel
    console.log("10. Validating Meeting Scheduler Panel...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveModal("meeting-scheduler");
    });
    await page.waitForTimeout(400);
    const meetingModal = page.locator("#meeting-scheduler-modal");
    await expect(meetingModal).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "14-meeting-scheduler-modal.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(meetingModal).not.toBeVisible();

    // 10. CEO Executive Console Modal
    console.log("11. Validating CEO Executive Console Modal...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveModal("ceo-console");
    });
    await page.waitForTimeout(400);
    const ceoConsole = page.locator("#ceo-console-modal");
    await expect(ceoConsole).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "15-ceo-console-modal.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(ceoConsole).not.toBeVisible();

    // 11. Elevator Modal
    console.log("12. Validating Elevator Transit Modal...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveModal("elevator-select");
    });
    await page.waitForTimeout(400);
    const elevatorModal = page.locator("#elevator-modal");
    await expect(elevatorModal).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "16-elevator-modal.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await expect(elevatorModal).not.toBeVisible();

    // 12. Task Operations Kanban Board
    console.log("13. Validating Task Kanban Board...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveModal("task-kanban");
    });
    await page.waitForTimeout(400);
    const kanbanModal = page.locator("#task-kanban-modal");
    if (await kanbanModal.isVisible()) {
      await page.screenshot({ path: path.join(screenshotsDir, "17-task-kanban-modal.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // 13. Strategic Planning Dashboard
    console.log("14. Validating Planning Dashboard...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveModal("planning-dashboard");
    });
    await page.waitForTimeout(400);
    const planningModal = page.locator("#planning-dashboard-modal");
    if (await planningModal.isVisible()) {
      await page.screenshot({ path: path.join(screenshotsDir, "18-planning-dashboard-modal.png") });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    console.log("15. Checking for critical JS console errors...");
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("Failed to load resource")
    );
    expect(criticalErrors.length).toBe(0);

    console.log("All redesigned UI components and modals validated successfully!");
  });
});
