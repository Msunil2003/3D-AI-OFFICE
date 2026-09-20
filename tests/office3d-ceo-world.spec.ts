import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

test.describe("AIOffice HQ — Virtual Software Company Founder/CEO World Experience", () => {
  const screenshotsDir = path.resolve("screenshots");

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test("Complete CEO World Journey, Physics, Collision, Interaction & 21-Shot Capture", async ({ page }) => {
    test.setTimeout(180_000);

    await page.setViewportSize({ width: 1920, height: 1080 });

    // Step 1: Launch AIOffice and verify Reception
    console.log("Navigating to AIOffice 3D on http://localhost:3001...");
    await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    // Verify Title and HUD Presence
    await expect(page).toHaveTitle(/AI Software Office 3D/i);
    const hudTitle = page.locator(".hud-title");
    await expect(hudTitle).toContainText("AIOFFICE HQ");

    // Capture 01-reception.png
    await page.screenshot({ path: path.join(screenshotsDir, "01-reception.png") });

    // Step 2: CEO Free Movement & Sprint Verification
    console.log("Testing CEO keyboard movement (W/A/S/D) & sprint...");
    const initialPos = await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      return [...store.ceo.position];
    });

    // Press 'W' for 500ms
    await page.keyboard.down("w");
    await page.waitForTimeout(600);
    await page.keyboard.up("w");
    await page.waitForTimeout(200);

    const movedPos = await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      return [...store.ceo.position];
    });

    // Expect CEO moved along Z or X
    const distMoved = Math.hypot(movedPos[0] - initialPos[0], movedPos[2] - initialPos[2]);
    console.log(`CEO moved distance: ${distMoved.toFixed(2)} meters`);
    expect(distMoved).toBeGreaterThan(0.2);

    // Step 3: Test Wall / Desk Collision (negative test)
    console.log("Verifying solid collision against obstacles...");
    // Walk into Reception Desk (Desk is at [0, 0, 13.1], radius 2.3)
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([0, 0, 14.5], 0);
      store.setCeoRotationY(0); // Facing North towards reception desk
    });
    await page.waitForTimeout(100);

    // Walk forward into desk
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("w", { delay: 100 });
    }
    const collidedPos = await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      return [...store.ceo.position];
    });
    // Check that CEO does not pass through the reception desk into minZ
    expect(collidedPos[2]).toBeGreaterThan(13.5);

    // Step 4: Walk into Central Atrium (Z = 0)
    console.log("Navigating CEO into Central Atrium...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([0, 0, 1.5], 0);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "02-atrium.png") });

    // Step 5: Engineering Wing Overview
    console.log("Entering Engineering Wing...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([-7.0, 0, 0], 0);
      store.setCeoRotationY(Math.PI / 2); // Looking west into engineering
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "03-engineering.png") });

    // Step 6: Backend Pod with Alex Dev
    console.log("Approaching Backend Pod...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([-11.0, 0, -3.2], 0);
      store.setCeoRotationY(Math.PI / 2);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "04-backend-pod.png") });

    // Step 7: Agent Proximity Prompt & CEO Conversation
    console.log("Testing Agent Proximity & Conversation with Alex...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      // Teleport CEO right next to Alex at Workstation 1 ([-15.2, 0, -4.8])
      store.teleportCeo([-14.0, 0, -4.8], 0);
      store.setCeoRotationY(Math.PI / 2);
    });
    await page.waitForTimeout(800);

    // Verify prompt appears
    const prompt = page.locator(".interaction-prompt-container");
    await expect(prompt).toBeVisible();

    // Press E to open conversation modal
    await page.keyboard.press("e");
    await page.waitForTimeout(600);

    const agentModal = page.locator("#agent-inspector");
    await expect(agentModal).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "14-agent-interaction.png") });

    // Step 8: Workstation Inspection, Git Diff, Terminal
    console.log("Testing Workstation Inspection modal...");
    const inspectBtn = page.locator("button:has-text('Inspect Workstation')");
    await inspectBtn.click();
    await page.waitForTimeout(600);

    const workstationModal = page.locator("#task-inspector-modal");
    await expect(workstationModal).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "15-agent-workstation.png") });

    // Close modal with ESC
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await expect(workstationModal).not.toBeVisible();

    // Step 9: CEO Walking Through Hallway
    console.log("Capturing CEO walking movement...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([-3.5, 0, -2.0], 0);
      store.setCeoMoving(true, true);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, "16-ceo-walking.png") });
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setCeoMoving(false);
    });

    // Step 10: QA Lab
    console.log("Entering QA Lab...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([13.0, 0, 4.0], 0);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "05-qa.png") });

    // Step 11: Security Operations
    console.log("Entering Security Operations...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([-13.0, 0, 11.5], 0);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "06-security.png") });

    // Step 12: DevOps Control
    console.log("Entering DevOps Control...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([13.0, 0, -8.0], 0);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "07-devops-control.png") });

    // Step 13: Incident War Room
    console.log("Entering Incident War Room...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([0, 0, -7.5], 0);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "12-war-room.png") });

    // Step 14: Governance Center
    console.log("Entering Governance Center...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([-11.0, 0, 6.0], 0);
      store.setCeoRotationY(Math.PI / 2);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "13-governance.png") });

    // Step 15: Grand Staircase
    console.log("Walking to Grand Staircase...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([-3.8, 1.8, 0.5], 0);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "19-stairs.png") });

    // Step 16: Elevator & Floor Selector
    console.log("Using Elevator...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([4.2, 0, -1.0], 0);
      store.setActiveModal("elevator-select");
    });
    await page.waitForTimeout(600);
    const elevatorModal = page.locator("#elevator-modal");
    await expect(elevatorModal).toBeVisible();
    await page.screenshot({ path: path.join(screenshotsDir, "18-elevator.png") });

    // Select Level +1 Leadership
    const floorPlus1Btn = page.locator("button:has-text('LEVEL +1')");
    await floorPlus1Btn.click();
    await page.waitForTimeout(1500);

    // Step 17: CEO Private Office (Level +1)
    console.log("Entering CEO Private Office...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([-12.5, 4.2, -6.5], 1);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "10-ceo-office.png") });

    // Step 18: AI Management & Command Center (Level +1)
    console.log("Entering Management Center...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([0, 4.2, -7.5], 1);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "09-management.png") });

    // Step 19: Executive Boardroom (Level +1)
    console.log("Entering Boardroom...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([12.5, 4.2, -4.0], 1);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "11-boardroom.png") });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "11-boardroom.png") });

    // Step 20: Calling & Conducting a Meeting
    console.log("Testing Meeting Scheduler & Active Meeting State...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setActiveMeeting({
        id: "meet-arch-rev",
        title: "Q3 Distributed Consensus & OCC Architecture Review",
        type: "Architecture Review",
        participants: ["Alex Dev", "Sarah Lead", "AI Manager"],
        agenda: [
          "Evaluate optimistic concurrency vs write locks",
          "Worktree isolation benchmarks",
          "Autonomous recovery protocol gates"
        ],
        status: "IN_PROGRESS",
        room: "boardroom"
      });
      store.teleportCeo([12.5, 4.2, -4.5], 1);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "17-meeting-active.png") });

    // Step 21: Level -1 Server Room & CI/CD Vault
    console.log("Entering Level -1 Infrastructure & Server Room...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.teleportCeo([0, -4.0, -2.0], -1);
      store.setCeoRotationY(0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "08-server-room.png") });

    // Step 22: Campus Exterior & Overview
    console.log("Switching to Campus Exterior / Overview Camera...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setCameraMode("overview");
      store.teleportCeo([0, 0, 0], 0);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(screenshotsDir, "20-campus-overview.png") });

    // Step 23: Final Signature CEO View
    console.log("Capturing Final Signature CEO Perspective...");
    await page.evaluate(() => {
      const store = (window as any).__officeStore.getState();
      store.setCameraMode("third-person");
      store.teleportCeo([-12.5, 4.2, -6.5], 1); // Looking out from CEO Office window
      store.setCeoRotationY(-Math.PI / 4);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(screenshotsDir, "21-final-ceo-view.png") });

    // Verify all 21 screenshots exist and are non-empty
    console.log("Verifying all 21 mandatory visual artifacts...");
    const requiredFiles = [
      "01-reception.png",
      "02-atrium.png",
      "03-engineering.png",
      "04-backend-pod.png",
      "05-qa.png",
      "06-security.png",
      "07-devops-control.png",
      "08-server-room.png",
      "09-management.png",
      "10-ceo-office.png",
      "11-boardroom.png",
      "12-war-room.png",
      "13-governance.png",
      "14-agent-interaction.png",
      "15-agent-workstation.png",
      "16-ceo-walking.png",
      "17-meeting-active.png",
      "18-elevator.png",
      "19-stairs.png",
      "20-campus-overview.png",
      "21-final-ceo-view.png"
    ];

    for (const filename of requiredFiles) {
      const filePath = path.join(screenshotsDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(5000);
    }

    console.log("All 21 visual artifacts captured and verified successfully!");
  });
});
