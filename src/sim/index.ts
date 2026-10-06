/**
 * The simulated business at "now" (docs/admin-v2/01): generated day by day from launch to today, kept
 * in memory, cut at `simNow()`. Read by `src/lib/api/local.ts` only; pages never import this.
 */
import { parisDay, simNow } from "@/lib/clock";
import { orders as fixtureOrders } from "@/data/orders";
import { HANDS_OFF_HOURS, LAUNCH_DATE, SIM_SEED } from "./config";
import { Simulator } from "./generate";
import { materialize, type MaterializedRows } from "./materialize";

export type { MaterializedRows, SimAuditLine } from "./materialize";
export { preLaunchCounts } from "./generate";

/** Settings › Simulation can change these (Phase 4); the defaults come from ./config.ts. */
let settings = { seed: SIM_SEED, handsOffHours: HANDS_OFF_HOURS, enabled: true };

export function setSimSettings(next: Partial<typeof settings>) {
  settings = { ...settings, ...next };
  memo = null;
  if (next.seed !== undefined && simulator?.seed !== next.seed) simulator = null;
}

export function simSettings() {
  return settings;
}

let simulator: Simulator | null = null;
let memo: { key: string; rows: MaterializedRows } | null = null;

/** Every day up to `day` generated (planned). */
function generatedUpTo(day: string): Simulator {
  if (!simulator || simulator.seed !== settings.seed) simulator = new Simulator(settings.seed);
  if (!simulator.lastDay || simulator.lastDay < day) simulator.run(day);
  return simulator;
}

/**
 * The instant generated rows are cut at: just before the current minute. A purchase in this browser is
 * dated there too (`orderTime`), so nothing generated can later appear before it and shift its number.
 */
export function simCut(now: number = simNow().getTime()): number {
  return Math.floor(now / 60_000) * 60_000 - 1;
}

/** The generated rows as they are at `now` (default: the simulated clock), memoised per minute. */
export function simRows(now: number = simNow().getTime()): MaterializedRows | null {
  if (!settings.enabled) return null;
  const minute = simCut(now);
  const today = parisDay(minute);
  if (today < LAUNCH_DATE) return null;
  const key = `${settings.seed}|${settings.handsOffHours}|${minute}`;
  if (memo?.key === key) return memo.rows;
  const sim = generatedUpTo(today);
  const fixturesToday = fixtureOrders.filter((o) => parisDay(o.paidAt) === today && Date.parse(o.paidAt) <= minute).length;
  const rows = materialize(sim.rows, minute, settings.handsOffHours * 3_600_000, fixturesToday);
  memo = { key, rows };
  return rows;
}

/** The planned rows (generated up to the last day read): the merge re-cuts the orders Lucas took over. */
export function plannedSimRows() {
  return simulator?.rows ?? null;
}

/** For tests and the Settings › Simulation tab: how far the history is generated. */
export function simGeneratedUpTo(): string | null {
  return simulator?.lastDay ?? null;
}
