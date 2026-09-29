import { defineConfig, devices } from "@playwright/test";

/**
 * Runs on the static export, as GitHub Pages serves it: `npm run build` first, then
 * `npm run test:e2e` (scripts/serve-out.mjs serves out/ on :4174 like GitHub Pages).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://localhost:4174", trace: "retain-on-failure" },
  webServer: { command: "node scripts/serve-out.mjs 4174", url: "http://localhost:4174", reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } } },
  ],
});
