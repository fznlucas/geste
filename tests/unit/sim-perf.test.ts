/**
 * Cost of the simulated history (docs/admin-v2/01 §2, docs/decisions.md "Admin v2 · history cache"), in
 * CPU time (`process.cpuUsage`: the work done, not the wall clock, so a busy machine does not fail it):
 * - cold: no cache, everything generated from launch to the reference day and cut at now — < 400 ms;
 * - warm: a reopening — the cached last complete day read (structured clone, as IndexedDB), today
 *   generated, the engine sent to the page (structured clone, as postMessage), cut at now — < 50 ms.
 * Fresh modules for each measure (`vi.resetModules`), the best of three (the cost, not the noise).
 * The reference day is the e2e clock; a later horizon is printed so the growth stays in view.
 * Run alone by `npm run test:unit` (its own process, after the other files).
 */
import { deserialize, serialize } from "node:v8";
import { expect, it, vi } from "vitest";
import { E2E_SIM_NOW } from "../../scripts/e2e-clock.mjs";

const REFERENCE = E2E_SIM_NOW.slice(0, 10);
const COLD_BUDGET_MS = 400;
const WARM_BUDGET_MS = 50;

const cpu = () => {
  const start = process.cpuUsage();
  return () => {
    const u = process.cpuUsage(start);
    return (u.user + u.system) / 1000;
  };
};

const dayBefore = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

async function engine() {
  vi.resetModules();
  const [{ Simulator }, { materialize }, { HANDS_OFF_HOURS, SIM_SEED }] = await Promise.all([import("@/sim/generate"), import("@/sim/materialize"), import("@/sim/config")]);
  const cut = (rows: Parameters<typeof materialize>[0], day: string) => materialize(rows, Date.parse(`${day}T10:00:00Z`), HANDS_OFF_HOURS * 3_600_000);
  return { Simulator, cut, seed: SIM_SEED };
}

async function cold(day: string): Promise<{ ms: number; orders: number }> {
  const { Simulator, cut, seed } = await engine();
  const stop = cpu();
  const sim = new Simulator(seed);
  sim.run(day);
  cut(sim.rows, day);
  return { ms: stop(), orders: sim.rows.orders.length };
}

async function warm(day: string): Promise<{ ms: number; cacheMb: number }> {
  const prepared = await engine();
  const previous = new prepared.Simulator(prepared.seed);
  previous.run(dayBefore(day));
  const cached = serialize(previous.snapshot());
  const { Simulator, cut } = await engine();
  const stop = cpu();
  const sim = Simulator.restore(deserialize(cached));
  sim.run(day);
  const page = Simulator.restore(deserialize(serialize(sim.snapshot())));
  cut(page.rows, day);
  return { ms: stop(), cacheMb: cached.length / 1e6 };
}

async function best<T extends { ms: number }>(f: () => Promise<T>): Promise<T> {
  const runs: T[] = [];
  for (let i = 0; i < 3; i++) runs.push(await f());
  return runs.sort((a, b) => a.ms - b.ms)[0]!;
}

it(`cold (no cache) up to ${REFERENCE}: < ${COLD_BUDGET_MS} ms CPU; warm (reopening from the cache): < ${WARM_BUDGET_MS} ms CPU`, async () => {
  const c = await best(() => cold(REFERENCE));
  const w = await best(() => warm(REFERENCE));
  console.info(`Sim CPU at ${REFERENCE}: cold ${c.ms.toFixed(0)} ms (${c.orders} orders) · warm ${w.ms.toFixed(0)} ms (cache ${w.cacheMb.toFixed(1)} MB)`);
  // In view, not a budget: six months later the history is about five times larger.
  const later = "2027-04-01";
  const lc = await best(() => cold(later));
  const lw = await best(() => warm(later));
  console.info(`Sim CPU at ${later}: cold ${lc.ms.toFixed(0)} ms (${lc.orders} orders) · warm ${lw.ms.toFixed(0)} ms (cache ${lw.cacheMb.toFixed(1)} MB)`);
  expect(c.ms, `cold generation took ${c.ms.toFixed(0)} ms CPU`).toBeLessThan(COLD_BUDGET_MS);
  expect(w.ms, `a reopening from the cache took ${w.ms.toFixed(0)} ms CPU`).toBeLessThan(WARM_BUDGET_MS);
}, 120_000);
