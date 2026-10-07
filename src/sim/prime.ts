/**
 * Bringing the engine to today (docs/admin-v2/01 §2), in the Web Worker (or on the page when there is
 * none). The cache holds the history up to the last day generated, as bytes (`wire.ts`): the rows and
 * the engine state. A day is generated in full and cut at the minute on the page, so a day in the cache
 * is complete: the same day reopened generates nothing; a later day generates the missing days only.
 * No cache (private window, no IndexedDB, dev server): everything is generated, nothing breaks.
 */
import { LAUNCH_DATE } from "./config";
import { Simulator } from "./generate";
import { decodeRows, decodeState, encodeRows, encodeState } from "./wire";

/** One cached history: up to `lastDay` (included), rows and engine state as JSON bytes. */
export interface HistoryRecord {
  seed: string;
  lastDay: string;
  rows: ArrayBuffer;
  state: ArrayBuffer;
}

/** Where the history is kept: IndexedDB in the browser, a Map in the tests. */
export interface HistoryStore {
  get(key: string): Promise<HistoryRecord | null>;
  /** Copies the record when called (the buffers can be transferred right after). */
  put(key: string, record: HistoryRecord): Promise<void>;
}

export interface PrimeRequest {
  seed: string;
  /** The Paris day to reach (generated in full; the page cuts it at the minute). */
  today: string;
  /** Null: no cache. */
  key: string | null;
}

export interface PrimeResult extends HistoryRecord {
  /** Where the history came from: the cache (maybe with days added) or generated from launch. */
  from: "cache" | "cold";
  /** Last day read from the cache. */
  cachedUpTo: string | null;
  /** Days generated this time. */
  daysComputed: number;
  /** Wall time in the worker, ms. */
  ms: number;
}

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T12:00:00Z`) / 86_400_000);

/** Usable for `today`: same seed, and not past it (a clock moved back cannot rewind the history). */
export const usableFor = (rec: HistoryRecord | null, seed: string, today: string): rec is HistoryRecord => !!rec && rec.seed === seed && rec.lastDay <= today;

export async function primeEngine(req: PrimeRequest, store: HistoryStore | null): Promise<PrimeResult> {
  const t = performance.now();
  let cached: HistoryRecord | null = null;
  if (store && req.key) {
    try {
      cached = await store.get(req.key);
    } catch {
      cached = null; // Unreadable cache: generate.
    }
  }
  const usable = usableFor(cached, req.seed, req.today) ? cached : null;
  if (usable && usable.lastDay === req.today) {
    return { ...usable, from: "cache", cachedUpTo: usable.lastDay, daysComputed: 0, ms: performance.now() - t };
  }
  let sim: Simulator;
  if (usable) {
    const rows = decodeRows(usable.rows);
    sim = Simulator.restore(decodeState(usable.state, rows));
  } else {
    sim = new Simulator(req.seed);
  }
  sim.run(req.today);
  const record: HistoryRecord = { seed: req.seed, lastDay: req.today, rows: encodeRows(sim.rows), state: encodeState(sim.snapshot()) };
  // Kept for the next opening (never over a later history: going back in time keeps it).
  if (store && req.key && (!cached || cached.lastDay <= req.today)) {
    try {
      await store.put(req.key, record);
    } catch {
      // Full or blocked storage: the page works without the cache.
    }
  }
  const from = usable ? "cache" : "cold";
  const start = usable ? usable.lastDay : null;
  const daysComputed = req.today < LAUNCH_DATE ? 0 : dayNumber(req.today) - (start ? dayNumber(start) : dayNumber(LAUNCH_DATE) - 1);
  return { ...record, from, cachedUpTo: start, daysComputed, ms: performance.now() - t };
}
