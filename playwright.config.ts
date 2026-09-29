import { defineConfig, devices } from "@playwright/test";

/**
 * Runs on the static export, as GitHub Pages serves it: `npm run build` first, then
 * `npm run test:e2e` (serves out/ on :4174). docs/mock-plan.md M7 adds the other flows.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // The static server is a plain Python one: keep the load light.
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://localhost:4174", trace: "retain-on-failure" },
  webServer: { command: "python3 -m http.server 4174 -d out", url: "http://localhost:4174", reuseExistingServer: true, stderr: "ignore" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } } },
  ],
});
