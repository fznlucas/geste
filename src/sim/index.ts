/**
 * The simulated business at "now" (docs/admin-v2/01): generated day by day from launch to today, kept
 * in memory, cut at `simNow()`. Read by `src/lib/api/local.ts` only; pages never import this.
 *
 * In the browser (docs/decisions.md "Admin v2 · history cache"):
 * - As the app loads, the IndexedDB cache is read on the page (bytes: a copy, decoded once). A history
 *   of the same day is used as is; nothing is generated.
 * - Otherwise a small history (under WORKER_FROM_DAYS days since launch) is generated on the page when
 *   first read, as before (the fast path), and the worker fills the cache in the background; a larger
 *   one is brought by the Web Worker (cache + missing days), the admin showing its Mist blocks meanwhile.
 * - The admin waits for the cache read (a few ms, at most CACHE_WAIT_MS) before its first read; the
 *   store never waits: it uses the cache when it is there, otherwise it generates on the page as before.
 * In Node (tests, the static build) everything is generated at once.
 */
import { parisDay, simNow, simToday } from "@/lib/clock";
import { orders as fixtureOrders } from "@/data/orders";
import { HANDS_OFF_HOURS, LAUNCH_DATE, SIM_SEED } from "./config";
import { Simulator } from "./generate";
import { idbStore } from "./idb";
import { materialize, type MaterializedRows } from "./materialize";
import { primeEngine, usableFor, type HistoryRecord, type PrimeRequest, type PrimeResult } from "./prime";
import type { SimRows } from "./types";
import { simCacheKey } from "./version";
import { decodeRows, decodeState } from "./wire";

export type { MaterializedRows, SimAuditLine } from "./materialize";
export { preLaunchCounts } from "./generate";

/**
 * From this many days of history (since launch), a cache miss would be filled by the worker instead of
 * being generated on the page — once the worker brings the dashboard sooner. Measured in Chrome from 93
 * to 915 days of history (Oct 2026 → Jan 2029), it never does: generating on the page is faster and
 * blocks no more (the page's own cost is the metrics, not the generation). So a miss is generated on the
 * page; the worker fills the cache in the background (`?simMode=worker` forces it). Measures:
 * docs/decisions.md "Admin v2 · history cache, modes".
 */
export const WORKER_FROM_DAYS = Number.POSITIVE_INFINITY;
/** The admin waits this long at most for the cache read before generating. */
const CACHE_WAIT_MS = 150;
/** More days than this to catch up on the page (the clock moved far ahead): ask the worker again. */
const CATCH_UP_ON_PAGE = 7;

/** Settings › Simulation can change these (Phase 4); the defaults come from ./config.ts. */
let settings = { seed: SIM_SEED, handsOffHours: HANDS_OFF_HOURS, enabled: true };

export function setSimSettings(next: Partial<typeof settings>) {
  const seedChanged = next.seed !== undefined && next.seed !== settings.seed;
  settings = { ...settings, ...next };
  memo = null;
  if (seedChanged) {
    history = null;
    if (BROWSER) boot();
  }
}

export function simSettings() {
  return settings;
}

/** The planned history on hand: rows up to `lastDay`; the engine itself only once a later day is needed. */
interface History {
  seed: string;
  lastDay: string;
  rows: SimRows;
  sim: Simulator | null;
  /** The engine state as bytes (from the cache or the worker), decoded only if days must be added here. */
  stateBuf: ArrayBuffer | null;
}
let history: History | null = null;
let memo: { key: string; rows: MaterializedRows } | null = null;

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
const historyDays = (today: string) => dayNumber(today) - dayNumber(LAUNCH_DATE) + 1;

// ── Browser: cache, worker, readiness ─────────────────────────────────────────

const BROWSER = typeof window !== "undefined";
/** On an admin page now (the app navigates without reloading: read it each time). */
const onAdmin = () => BROWSER && /\/admin(\/|$)/.test(window.location.pathname) && !/\/admin\/login/.test(window.location.pathname);

/** `?simMode=page|worker` (measures, e2e): force the path a cache miss takes; read as the app loads. */
const FORCED_MODE: "page" | "worker" | null = (() => {
  if (!BROWSER) return null;
  try {
    const m = new URLSearchParams(window.location.search).get("simMode");
    return m === "page" || m === "worker" ? m : null;
  } catch {
    return null;
  }
})();
const forcedMode = () => FORCED_MODE;
const workerPathFor = (today: string) => (forcedMode() ?? (historyDays(today) >= WORKER_FROM_DAYS ? "worker" : "page")) === "worker" && typeof Worker !== "undefined";

let cacheState: "reading" | "settled" = "settled";
/** A usable cached history not decoded yet (the store decodes it at its first read, the admin at once). */
let pendingRecord: { rec: HistoryRecord; ms: number } | null = null;
let workerFor: string | null = null;
let worker: Worker | null = null;
let waiters: Array<() => void> = [];
const listeners = new Set<() => void>();
let version = 0;

/** What brought the history in this tab (Settings › Simulation, the e2e tests). */
export interface SimPrimeInfo {
  from: "cache" | "cold";
  cachedUpTo: string | null;
  daysComputed: number;
  ms: number;
  /** Where the days were generated: the worker, the page, or nowhere (the cache had the day). */
  where: "worker" | "page" | "none";
  /** False when there was no cache to read or write (private window, no IndexedDB, dev server). */
  cache: boolean;
  until: string;
}
let lastPrime: SimPrimeInfo | null = null;

function changed() {
  version++;
  if (!simPending()) {
    const w = waiters;
    waiters = [];
    for (const f of w) f();
  }
  // Later, never inside a render (a read during a render may install the history).
  queueMicrotask(() => {
    for (const l of listeners) l();
  });
}

/** React: re-read when the history arrives or changes. */
export function subscribeSim(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Changes each time the history arrives or is reset (a dependency for memos and queries). */
export function simVersion(): number {
  return version;
}

const covers = (h: History | null, day: string) => !!h && h.seed === settings.seed && (h.lastDay >= day || (dayNumber(day) - dayNumber(h.lastDay) <= CATCH_UP_ON_PAGE && (!!h.sim || !!h.stateBuf)));

/**
 * The admin, before its first read: the cache read is not over yet (a few ms), or a large history is on
 * its way from the worker. The store is never pending: it generates on the page when it must.
 */
export function simPending(): boolean {
  if (!onAdmin() || !settings.enabled) return false;
  const today = simToday();
  if (today < LAUNCH_DATE || covers(history, today)) return false;
  return cacheState === "reading" || workerPathFor(today);
}

export function simPrimeInfo(): SimPrimeInfo | null {
  return lastPrime;
}

/** Resolves once reads may go (at once in Node, on the store, when the simulation is off or before launch). */
export function whenSimReady(): Promise<void> {
  if (!simPending()) return Promise.resolve();
  ensureWorker(simToday());
  return new Promise((resolve) => waiters.push(resolve));
}

/** The cached history read at load, decoded now if it serves `day` (its missing days are added when read). */
function adoptRecord(day: string): boolean {
  if (!pendingRecord || covers(history, day) || !usableFor(pendingRecord.rec, settings.seed, day)) return false;
  const { rec, ms } = pendingRecord;
  pendingRecord = null;
  install(rec, { from: "cache", cachedUpTo: rec.lastDay, daysComputed: 0, ms, where: "none", cache: true });
  if (rec.lastDay < day) fillCacheLater(day);
  return true;
}

function install(rec: HistoryRecord, info: Omit<SimPrimeInfo, "until">) {
  // In the browser's performance timeline: where the history came from, when.
  performance.mark(`sim:installed:${info.from}:${info.where}`);
  history = { seed: rec.seed, lastDay: rec.lastDay, rows: decodeRows(rec.rows), sim: null, stateBuf: rec.state };
  memo = null;
  lastPrime = { ...info, until: rec.lastDay };
  changed();
}

function newWorker(): Worker | null {
  try {
    return new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
}

const request = (today: string): PrimeRequest => ({ seed: settings.seed, today, key: typeof indexedDB === "undefined" ? null : simCacheKey(settings.seed) });

type Primed = { result: PrimeResult; where: "worker" | "page" };

/** Large history, no usable cache: the worker brings it (Mist blocks meanwhile). */
function ensureWorker(today: string) {
  if (!workerPathFor(today) || cacheState === "reading") return;
  const req = request(today);
  const id = `${req.seed}|${today}`;
  if (workerFor === id) return;
  workerFor = id;
  const w = worker ?? newWorker();
  worker = null;
  const onPage = async (): Promise<Primed> => {
    await new Promise((r) => setTimeout(r, 0)); // let the Mist blocks paint
    return { result: await primeEngine(req, req.key ? idbStore() : null), where: "page" };
  };
  const run: Promise<Primed> = w
    ? new Promise<Primed>((resolve, reject) => {
        w.onmessage = (e: MessageEvent<{ ok: true; result: PrimeResult } | { ok: false; error: string }>) => {
          w.terminate();
          if (e.data.ok) resolve({ result: e.data.result, where: "worker" });
          else reject(new Error(e.data.error));
        };
        w.onerror = () => {
          w.terminate();
          reject(new Error("worker failed"));
        };
        w.postMessage(req);
      }).catch(onPage)
    : onPage();
  void run.then(({ result, where }) => {
    if (workerFor !== id) return; // another seed or day replaced it
    workerFor = null;
    if (covers(history, today)) return; // generated on the page meanwhile: the same history
    install(result, { from: result.from, cachedUpTo: result.cachedUpTo, daysComputed: result.daysComputed, ms: Math.round(result.ms), where, cache: !!req.key });
  });
}

/** After the page has a history the cache lacks: the worker brings the cache up to date, in the background. */
function fillCacheLater(today: string) {
  const req = request(today);
  // Only from the admin: on the store a checkout must not share the machine with a background generation.
  if (!req.key || typeof Worker === "undefined" || !onAdmin()) return;
  const go = () => {
    const w = newWorker();
    if (!w) return;
    w.onmessage = () => w.terminate();
    w.onerror = () => w.terminate();
    w.postMessage({ ...req, fill: true });
  };
  if (typeof requestIdleCallback === "function") requestIdleCallback(go, { timeout: 5000 });
  else setTimeout(go, 2000);
}

/** As the app loads: read the cache on the page; start the worker now if a large history may need it. */
function boot() {
  if (!settings.enabled) return;
  const today = simToday();
  if (today < LAUNCH_DATE) return;
  const req = request(today);
  if (workerPathFor(today) && !worker) worker = newWorker();
  if (!req.key) {
    cacheState = "settled";
    if (onAdmin()) ensureWorker(today);
    return;
  }
  cacheState = "reading";
  const t = performance.now();
  const store = idbStore()!;
  const settle = (rec: HistoryRecord | null) => {
    if (cacheState === "settled") return;
    cacheState = "settled";
    let changedNow = false;
    if (!covers(history, today) && usableFor(rec, req.seed, today)) {
      pendingRecord = { rec, ms: Math.round(performance.now() - t) };
      // The admin reads it at once; the store only if a page needs the history (bytes kept meanwhile).
      if (onAdmin()) changedNow = adoptRecord(today);
    } else if (history && !usableFor(rec, req.seed, today)) {
      // Generated on the page before the read ended, and the cache lacks it: fill it in the background.
      fillCacheLater(history.lastDay);
    }
    if (workerPathFor(today) && !covers(history, today) && !pendingRecord) ensureWorker(today);
    else if (worker) {
      worker.terminate();
      worker = null;
    }
    // Wake the admin's first read (it waited for this read); the store re-renders only if something changed.
    if (changedNow || onAdmin()) changed();
  };
  void store.get(req.key).then(settle, () => settle(null));
  // Never stuck on a slow storage.
  setTimeout(() => settle(null), CACHE_WAIT_MS);
}

if (BROWSER) boot();

// ── Generated rows ───────────────────────────────────────────────────────────

function engineOf(h: History): Simulator {
  if (!h.sim) {
    h.sim = h.stateBuf ? Simulator.restore(decodeState(h.stateBuf, h.rows)) : new Simulator(h.seed);
    h.stateBuf = null;
  }
  return h.sim;
}

/** Every day up to `day` generated (planned); null in the admin while the worker brings a large one. */
function historyUpTo(day: string): History | null {
  if (history && history.seed !== settings.seed) history = null;
  if (!history || history.lastDay < day) adoptRecord(day);
  if (history && history.lastDay >= day) return history;
  if (history && covers(history, day)) {
    const sim = engineOf(history);
    const added = dayNumber(day) - dayNumber(history.lastDay);
    if (lastPrime && lastPrime.until === history.lastDay) lastPrime = { ...lastPrime, daysComputed: lastPrime.daysComputed + added, where: "page", until: day };
    sim.run(day);
    history.rows = sim.rows;
    history.lastDay = day;
    return history;
  }
  if (BROWSER && simPending()) {
    ensureWorker(day);
    return null;
  }
  // Node, the store, a small history: generate here, as before.
  const t = BROWSER ? performance.now() : 0;
  const sim = new Simulator(settings.seed);
  sim.run(day);
  history = { seed: settings.seed, lastDay: day, rows: sim.rows, sim, stateBuf: null };
  if (BROWSER) {
    performance.measure("sim:generated:page", { start: t });
    // "Kept for the next opening" only where the worker will fill the cache (the admin, with IndexedDB and a Worker).
    lastPrime = { from: "cold", cachedUpTo: null, daysComputed: historyDays(day), ms: Math.round(performance.now() - t), where: "page", cache: !!request(day).key && typeof Worker !== "undefined" && onAdmin(), until: day };
    if (cacheState === "settled") fillCacheLater(day);
  }
  return history;
}

/**
 * The instant generated rows are cut at: just before the current minute. A purchase in this browser is
 * dated there too (`orderTime`), so nothing generated can later appear before it and shift its number.
 */
export function simCut(now: number = simNow().getTime()): number {
  return Math.floor(now / 60_000) * 60_000 - 1;
}

/** The generated rows as they are at `now` (default: the simulated clock), memoised per minute. Null: off, before launch, or (admin) not arrived yet. */
export function simRows(now: number = simNow().getTime()): MaterializedRows | null {
  if (!settings.enabled) return null;
  const minute = simCut(now);
  const today = parisDay(minute);
  if (today < LAUNCH_DATE) return null;
  if (memo?.key === `${settings.seed}|${settings.handsOffHours}|${minute}|${version}`) return memo.rows;
  const h = historyUpTo(today);
  if (!h) return null;
  // After the read: it may have decoded the cache (a new version).
  const key = `${settings.seed}|${settings.handsOffHours}|${minute}|${version}`;
  const fixturesToday = fixtureOrders.filter((o) => parisDay(o.paidAt) === today && Date.parse(o.paidAt) <= minute).length;
  const rows = materialize(h.rows, minute, settings.handsOffHours * 3_600_000, fixturesToday);
  memo = { key, rows };
  return rows;
}

/** The planned rows (generated up to the last day read): the merge re-cuts the orders Lucas took over. */
export function plannedSimRows() {
  return history?.rows ?? null;
}

/** For tests and the Settings › Simulation tab: how far the history is generated. */
export function simGeneratedUpTo(): string | null {
  return history?.lastDay ?? null;
}
