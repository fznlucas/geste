import { readFileSync } from "node:fs";
import { E2E_SIM_NOW } from "../scripts/e2e-clock.mjs";

/** The tests expect the pinned clock of `npm run build:e2e`; a plain `npm run build` uses real time. */
export default function globalSetup() {
  let marker = "";
  try {
    marker = readFileSync("out/.sim-now", "utf8").trim();
  } catch {
    // No marker: production build or no build.
  }
  if (marker !== E2E_SIM_NOW) {
    throw new Error(`out/ was not built for the tests (clock "${marker || "real time"}", expected ${E2E_SIM_NOW}). Run \`npm run build:e2e\` first.`);
  }
}
