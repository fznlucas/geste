/**
 * The simulated business at "now" (docs/admin-v2/01): generated day by day from launch to today, kept
 * in memory, cut at `simNow()`. Read by `src/lib/api/local.ts` only; pages never import this.
 *
 * In the browser the history is brought to today by a Web Worker, from the IndexedDB cache of complete
 * days when it has one (`prime.ts`): until it answers, reads see no simulated rows (`simPending()`), the
 * admin shows its Mist blocks and the store waits (`whenSimReady()`). In Node (tests, the static build)
 * everything is generated at once, as before. No Worker: the same work on the page; no IndexedDB: no cache.
 */
import { parisDay, simNow, simToday } from "@/lib/clock";
import { orders as fixtureOrders } from "@/data/orders";
import { HANDS_OFF_HOURS, LAUNCH_DATE, SIM_SEED } from "./config";
import { Simulator } from "./generate";
import { idbStore } from "./idb";
import { materialize, type MaterializedRows } from "./materialize";
import { primeEngine, type PrimeRequest, type PrimeResult } from "./prime";
import { simCacheKey } from "./version";

export type { MaterializedRows, SimAuditLine } from "./materialize";
export { preLaunchCounts } from "./generate";

/** Settings › Simulation can change these (Phase 4); the defaults come from ./config.ts. */
let settings = { seed: SIM_SEED, handsOffHours: HANDS_OFF_HOURS, enabled: true };

export function setSimSettings(next: Partial<typeof settings>) {
  settings = { ...settings, ...next };
  memo = null;
  if (next.seed !== undefined && simulator?.seed !== next.seed) {
    simulator = null;
    if (BROWSER) setPhase("idle");
  }
}

export function simSettings() {
  return settings;
}

let simulator: Simulator | null = null;
let memo: { key: string; rows: MaterializedRows } | null = null;

// ── Browser: the worker, readiness ───────────────────────────────────────────

const BROWSER = typeof window !== "undefined";
/** More days than this to catch up on the page (the clock moved far ahead): ask the worker again. */
const CATCH_UP_ON_PAGE = 7;

type Phase = "idle" | "pending" | "ready";
let phase: Phase = BROWSER ? "idle" : "ready";
let pendingFor: string | null = null;
let waiters: Array<() => void> = [];
const listeners = new Set<() => void>();
let version = 0;

/** What the last bringing-up did (Settings › Simulation, the e2e tests): cache or cold, days, time. */
export interface SimPrimeInfo {
  from: PrimeResult["from"];
  cachedUpTo: string | null;
  daysComputed: number;
  ms: number;
  /** Where it ran: the worker, or the page (no Worker). */
  where: "worker" | "page";
  /** False when there was no cache to read or write (private window, no IndexedDB, dev server). */
  cache: boolean;
  until: string;
}
let lastPrime: SimPrimeInfo | null = null;

function setPhase(next: Phase) {
  phase = next;
  version++;
  if (next === "ready") {
    const w = waiters;
    waiters = [];
    for (const f of w) f();
  }
  // Later, never inside a render (a read during a render may start the worker).
  queueMicrotask(() => {
    for (const l of listeners) l();
  });
}

/** React: re-read when the simulated history arrives or changes. */
export function subscribeSim(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Changes each time the history arrives or is reset (a dependency for memos and queries). */
export function simVersion(): number {
  return version;
}

/** In the browser, before the worker has answered: reads see no simulated rows yet. */
export function simPending(): boolean {
  return BROWSER && settings.enabled && phase !== "ready" && simToday() >= LAUNCH_DATE;
}

export function simPrimeInfo(): SimPrimeInfo | null {
  return lastPrime;
}

/** Resolves once the history covers today (at once in Node, when the simulation is off, or before launch). */
export function whenSimReady(): Promise<void> {
  if (!simPending()) return Promise.resolve();
  startPrime(simToday());
  return new Promise((resolve) => waiters.push(resolve));
}

function runInWorker(req: PrimeRequest): Promise<PrimeResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
    } catch (e) {
      reject(e);
      return;
    }
    worker.onmessage = (e: MessageEvent<{ ok: true; result: PrimeResult } | { ok: false; error: string }>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.result);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "worker failed"));
    };
    worker.postMessage(req);
  });
}

async function runOnPage(req: PrimeRequest): Promise<PrimeResult> {
  // Let the page paint its Mist blocks first.
  await new Promise((r) => setTimeout(r, 0));
  return primeEngine(req, req.key ? idbStore() : null);
}

function startPrime(today: string) {
  // No IndexedDB here (private window, blocked storage): no key, so nothing is read or written in the worker either.
  const req: PrimeRequest = { seed: settings.seed, today, key: typeof indexedDB === "undefined" ? null : simCacheKey(settings.seed) };
  const id = `${req.seed}|${today}`;
  if (phase === "pending" && pendingFor === id) return;
  pendingFor = id;
  // Marks in the browser's performance timeline: when the history was asked for and when it arrived.
  performance.mark("sim:start");
  if (phase !== "pending") setPhase("pending");
  const onPage = () => runOnPage(req).then((result) => ({ result, where: "page" as const }));
  const run = typeof Worker !== "undefined" ? runInWorker(req).then((result) => ({ result, where: "worker" as const }), onPage) : onPage();
  void run.then(
    ({ result, where }) => {
      // A newer request (another seed, the clock moved) replaced this one.
      if (pendingFor !== id) return;
      performance.mark("sim:received");
      simulator = Simulator.restore(result.snapshot);
      memo = null;
      pendingFor = null;
      lastPrime = { from: result.from, cachedUpTo: result.cachedUpTo, daysComputed: result.daysComputed, ms: Math.round(result.ms), where, cache: !!req.key, until: today };
      setPhase("ready");
      performance.mark("sim:ready");
    },
    () => {
      // Even the page could not generate (should not happen): generate in one go so the admin is never stuck.
      if (pendingFor !== id) return;
      simulator = new Simulator(req.seed);
      simulator.run(today);
      memo = null;
      pendingFor = null;
      setPhase("ready");
    },
  );
}

// The admin needs the history on every page: ask the worker as the code loads, before React hydrates
// (the store asks only when it reads it). A custom seed from Settings restarts it with that seed.
if (BROWSER && /\/admin(\/|$)/.test(window.location.pathname) && !/\/admin\/login/.test(window.location.pathname)) {
  queueMicrotask(() => {
    if (simPending()) startPrime(simToday());
  });
}

// ── Generated rows ───────────────────────────────────────────────────────────

/** Every day up to `day` generated (planned); null in the browser while the worker brings it. */
function generatedUpTo(day: string): Simulator | null {
  if (simulator && simulator.seed !== settings.seed) simulator = null;
  if (BROWSER) {
    const daysBehind = simulator?.lastDay ? Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${simulator.lastDay}T12:00:00Z`)) / 86_400_000) : Infinity;
    if (!simulator || phase !== "ready" || daysBehind > CATCH_UP_ON_PAGE) {
      startPrime(day);
      return null;
    }
  }
  if (!simulator) simulator = new Simulator(settings.seed);
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

/** The generated rows as they are at `now` (default: the simulated clock), memoised per minute. Null: off, before launch, or (browser) not arrived yet. */
export function simRows(now: number = simNow().getTime()): MaterializedRows | null {
  if (!settings.enabled) return null;
  const minute = simCut(now);
  const today = parisDay(minute);
  if (today < LAUNCH_DATE) return null;
  const key = `${settings.seed}|${settings.handsOffHours}|${minute}|${version}`;
  if (memo?.key === key) return memo.rows;
  const sim = generatedUpTo(today);
  if (!sim) return null;
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
