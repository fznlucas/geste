import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { E2E_SIM_NOW } from "./scripts/e2e-clock.mjs";

/**
 * Unit tests (Admin v2, docs/admin-v2/07): pure functions of `src/` — clock, simulation, ledger,
 * metrics — run in Node. The browser flows stay in Playwright (`e2e/`).
 */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Same instant as the e2e build, unless a test sets its own clock.
    env: { NEXT_PUBLIC_SIM_NOW: E2E_SIM_NOW, TZ: "UTC" },
  },
});
