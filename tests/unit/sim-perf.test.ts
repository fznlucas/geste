/**
 * The cache guard (docs/decisions.md "Admin v2 · performance"): with the clock on 2028-04-01, about 21
 * months of history, a cold generation (fresh worker, JIT included) must stay under the 400 ms budget.
 * When it does not, it is time for the IndexedDB cache and the Web Worker of docs/admin-v2/01 §2.
 * Run alone by `npm run test:unit` (its own process, after the other files): no CPU contention, and
 * the first run is the cold one.
 */
import { expect, it } from "vitest";
import { HANDS_OFF_HOURS, SIM_SEED } from "@/sim/config";
import { Simulator } from "@/sim/generate";
import { materialize } from "@/sim/materialize";

it("cold generation up to 2028-04-01 stays under 400 ms", () => {
  const t = performance.now();
  const sim = new Simulator(SIM_SEED);
  sim.run("2028-04-01");
  materialize(sim.rows, Date.parse("2028-04-01T10:00:00Z"), HANDS_OFF_HOURS * 3_600_000);
  const ms = performance.now() - t;
  console.info(`Sim performance (Node), cold up to 2028-04-01: ${ms.toFixed(0)} ms (${sim.rows.orders.length} orders)`);
  expect(ms, `cold generation took ${ms.toFixed(0)} ms: build the IndexedDB cache + Web Worker (spec 01 §2)`).toBeLessThan(400);
});
