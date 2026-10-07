/**
 * Cost of the simulated history (docs/admin-v2/01 §2, docs/decisions.md "Admin v2 · history cache"), in
 * CPU time (`process.cpuUsage`: the work done, not the wall clock, so a busy machine does not fail it),
 * on the reference day (the e2e clock) and on April 1, 2027 (about five times the history):
 * - cold (no cache): everything generated from launch and encoded (the worker), then decoded and cut at
 *   now (the page) — < 400 ms;
 * - warm (reopening the same day): the cached bytes read (a copy, as IndexedDB), decoded, cut — < 50 ms;
 * - the next day (cache of the day before): printed, not a budget (one day generated on the page).
 * Fresh modules for each measure (`vi.resetModules`), the best of three (the cost, not the noise).
 * Run alone by `npm run test:unit` (its own process, after the other files).
 */
import { expect, it, vi } from "vitest";
import { E2E_SIM_NOW } from "../../scripts/e2e-clock.mjs";

const DAYS = [E2E_SIM_NOW.slice(0, 10), "2027-04-01"];
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
  const [{ Simulator }, { materialize }, { HANDS_OFF_HOURS, SIM_SEED }, wire] = await Promise.all([import("@/sim/generate"), import("@/sim/materialize"), import("@/sim/config"), import("@/sim/wire")]);
  const cut = (rows: Parameters<typeof materialize>[0], day: string) => materialize(rows, Date.parse(`${day}T10:00:00Z`), HANDS_OFF_HOURS * 3_600_000);
  return { Simulator, cut, seed: SIM_SEED, ...wire };
}

/** A record as the cache keeps it, for `day`. */
async function record(day: string) {
  const e = await engine();
  const sim = new e.Simulator(e.seed);
  sim.run(day);
  return { lastDay: day, rows: e.encodeRows(sim.rows), state: e.encodeState(sim.snapshot()) };
}

async function cold(day: string) {
  const e = await engine();
  const stop = cpu();
  const sim = new e.Simulator(e.seed);
  sim.run(day);
  const rows = e.encodeRows(sim.rows);
  e.encodeState(sim.snapshot());
  e.cut(e.decodeRows(rows), day);
  return { ms: stop(), orders: sim.rows.orders.length, mb: rows.byteLength / 1e6 };
}

async function warm(day: string) {
  const cached = await record(day);
  const e = await engine();
  const stop = cpu();
  const rec = structuredClone(cached);
  e.cut(e.decodeRows(rec.rows), day);
  return { ms: stop() };
}

async function nextDay(day: string) {
  const cached = await record(dayBefore(day));
  const e = await engine();
  const stop = cpu();
  const rec = structuredClone(cached);
  const rows = e.decodeRows(rec.rows);
  const sim = e.Simulator.restore(e.decodeState(rec.state, rows));
  sim.run(day);
  e.cut(sim.rows, day);
  return { ms: stop() };
}

async function best<T extends { ms: number }>(f: () => Promise<T>): Promise<T> {
  const runs: T[] = [];
  for (let i = 0; i < 3; i++) runs.push(await f());
  return runs.sort((a, b) => a.ms - b.ms)[0]!;
}

for (const day of DAYS) {
  it(`${day}: cold (no cache) < ${COLD_BUDGET_MS} ms CPU, warm (same day from the cache) < ${WARM_BUDGET_MS} ms CPU`, async () => {
    const c = await best(() => cold(day));
    const w = await best(() => warm(day));
    const n = await best(() => nextDay(day));
    console.info(`Sim CPU at ${day}: cold ${c.ms.toFixed(0)} ms (${c.orders} orders, ${c.mb.toFixed(1)} MB) · warm ${w.ms.toFixed(0)} ms · next day ${n.ms.toFixed(0)} ms`);
    expect(c.ms, `cold took ${c.ms.toFixed(0)} ms CPU`).toBeLessThan(COLD_BUDGET_MS);
    expect(w.ms, `a same-day reopening took ${w.ms.toFixed(0)} ms CPU`).toBeLessThan(WARM_BUDGET_MS);
  }, 180_000);
}
