import { defineConfig, devices } from "@playwright/test";

/**
 * Runs on the static export, as GitHub Pages serves it: `npm run build` first, then
 * `npm run test:e2e` (scripts/serve-out.mjs serves out/ on :4174 like GitHub Pages).
 *
 * The "screens-*" projects only run on demand (`npm run screens`, `npm run screens:update`): admin
 * screenshots per route and role, kept in docs/admin-v2/screens/<SCREENS_SET>/ (e2e/screens.spec.ts).
 */
// 20 px / 0.35: Chrome resamples photos with a few pixels of noise between runs; one missing 12 px glyph is 30–40 px.
const SCREENS_SET = process.env.SCREENS_SET ?? "before";
const screens = {
  testMatch: /screens\.spec\.ts/,
  snapshotPathTemplate: `docs/admin-v2/screens/${SCREENS_SET}/{projectName}/{arg}{ext}`,
  expect: { toHaveScreenshot: { maxDiffPixels: 20, threshold: 0.35, animations: "disabled" as const, caret: "hide" as const } },
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://localhost:4174", trace: "retain-on-failure" },
  webServer: { command: "node scripts/serve-out.mjs 4174", url: "http://localhost:4174", reuseExistingServer: true },
  projects: [
    { name: "desktop", testIgnore: /screens\.spec\.ts/, use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "phone", testIgnore: /screens\.spec\.ts/, use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 } } },
    { name: "screens-1440", ...screens, use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 }, timezoneId: "Europe/Paris" } },
    { name: "screens-390", ...screens, use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 390, height: 844 }, timezoneId: "Europe/Paris" } },
  ],
});
