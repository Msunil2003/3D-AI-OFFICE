import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const RESOLUTIONS = [
  { name: "1366x768-laptop", width: 1366, height: 768 },
  { name: "1920x1080-desktop", width: 1920, height: 1080 },
  { name: "2560x1440-qhd", width: 2560, height: 1440 },
  { name: "3440x1440-ultrawide", width: 3440, height: 1440 },
];

test.describe("AIOffice Responsive Resolution Validation", () => {
  const outputDir = path.resolve("screenshots/responsive");

  test.beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  for (const res of RESOLUTIONS) {
    test(`Validate layout and capture surfaces at ${res.name} (${res.width}x${res.height})`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: res.width, height: res.height });
      await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);

      // 1. Executive Operating Bar & World Dominance
      const execBar = page.locator(".executive-bar");
      await expect(execBar).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, `${res.name}-01-world.png`) });

      // 2. Command Palette (Ctrl+K)
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(400);
      const searchModal = page.locator("#search-command-palette");
      await expect(searchModal).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, `${res.name}-02-search.png`) });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // 3. Command Center (CEO Console)
      await page.evaluate(() => {
        const store = (window as any).__officeStore.getState();
        store.setActiveModal("ceo-console");
      });
      await page.waitForTimeout(400);
      const consoleModal = page.locator("#ceo-console-modal");
      await expect(consoleModal).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, `${res.name}-03-command-center.png`) });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // 4. Workstation Inspector
      await page.evaluate(() => {
        const store = (window as any).__officeStore.getState();
        store.setSelectedWorkstationId("ws-alex");
        store.setActiveModal("workstation-inspect");
      });
      await page.waitForTimeout(400);
      const wsModal = page.locator("#task-inspector-modal");
      await expect(wsModal).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, `${res.name}-04-workstation.png`) });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // 5. Governance Decision Console
      await page.evaluate(() => {
        const store = (window as any).__officeStore.getState();
        store.setActiveModal("governance-gate");
      });
      await page.waitForTimeout(400);
      const govModal = page.locator("#governance-approval-modal");
      await expect(govModal).toBeVisible();
      await page.screenshot({ path: path.join(outputDir, `${res.name}-05-governance.png`) });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    });
  }
});
