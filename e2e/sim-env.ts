/**
 * Imported first by e2e/helpers.ts: the app's modules read the clock when they load, so the pinned
 * e2e clock (the one `npm run build:e2e` baked into out/) must be set before them.
 */
import { E2E_SIM_NOW } from "../scripts/e2e-clock.mjs";

process.env.NEXT_PUBLIC_SIM_NOW = E2E_SIM_NOW;
