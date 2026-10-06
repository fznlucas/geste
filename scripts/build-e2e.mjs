/**
 * `npm run build:e2e`: the static export with the clock pinned (docs/admin-v2/01 §1), so the e2e
 * tests read a stable simulated history. Writes out/.sim-now; Playwright refuses to run without it
 * (e2e/global-setup.ts), so a production build (real clock) is never tested by mistake.
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { E2E_SIM_NOW } from "./e2e-clock.mjs";

execSync("npm run build", { stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_SIM_NOW: E2E_SIM_NOW } });
writeFileSync("out/.sim-now", `${E2E_SIM_NOW}\n`);
console.log(`out/ built with NEXT_PUBLIC_SIM_NOW=${E2E_SIM_NOW}`);
