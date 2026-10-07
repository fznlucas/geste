/**
 * Bringing the engine to today (docs/admin-v2/01 §2), in the Web Worker or, failing that, on the page:
 * the history up to the last complete day comes from the cache when it has it; only the days after it
 * and today are generated. The last complete day (yesterday) is saved for the next opening; today is
 * not (it is generated in full, then cut at the minute, every time). No cache (private window, no
 * IndexedDB, dev server): everything is generated, nothing breaks.
 */
import { LAUNCH_DATE } from "./config";
import { Simulator, type SimSnapshot } from "./generate";

/** Where complete days are kept: IndexedDB in the browser, a Map in the tests. */
export interface SnapshotStore {
  get(key: string): Promise<SimSnapshot | null>;
  /** Clones the snapshot when called (structured clone): the engine may run on right after. */
  put(key: string, snapshot: SimSnapshot): Promise<void>;
}

export interface PrimeRequest {
  seed: string;
  /** The Paris day to reach (generated in full; the page cuts it at the minute). */
  today: string;
  /** Null: no cache. */
  key: string | null;
}

export interface PrimeResult {
  snapshot: SimSnapshot;
  /** Where the history came from: the cache (complete days) or generated from launch. */
  from: "cache" | "cold";
  /** Last complete day read from the cache. */
  cachedUpTo: string | null;
  /** Days generated this time (missing complete days + today). */
  daysComputed: number;
  /** Time spent, ms (wall, in the worker). */
  ms: number;
}

const days = (from: string | null, to: string) => {
  if (to < LAUNCH_DATE) return 0;
  const start = from && from >= LAUNCH_DATE ? Date.parse(`${from}T12:00:00Z`) + 86_400_000 : Date.parse(`${LAUNCH_DATE}T12:00:00Z`);
  return Math.max(0, Math.round((Date.parse(`${to}T12:00:00Z`) - start) / 86_400_000) + 1);
};

const dayBefore = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export async function primeEngine(req: PrimeRequest, store: SnapshotStore | null): Promise<PrimeResult> {
  const t = performance.now();
  const yesterday = dayBefore(req.today);
  let cached: SimSnapshot | null = null;
  if (store && req.key) {
    try {
      cached = await store.get(req.key);
    } catch {
      cached = null; // Unreadable cache: generate.
    }
  }
  // A cache past yesterday (the clock was moved back) cannot be rewound: generate from launch.
  const usable = cached && cached.seed === req.seed && (!cached.lastDay || cached.lastDay <= yesterday) ? cached : null;
  const sim = usable ? Simulator.restore(usable) : new Simulator(req.seed);
  const cachedUpTo = usable?.lastDay ?? null;
  if (yesterday >= LAUNCH_DATE && (!sim.lastDay || sim.lastDay < yesterday)) {
    sim.run(yesterday);
    // Save the complete days for the next opening (never over a later cache: going back in time keeps it).
    if (store && req.key && (!cached?.lastDay || cached.lastDay <= yesterday)) {
      try {
        await store.put(req.key, sim.snapshot());
      } catch {
        // Full or blocked storage: the page works without the cache.
      }
    }
  }
  sim.run(req.today);
  return { snapshot: sim.snapshot(), from: usable ? "cache" : "cold", cachedUpTo, daysComputed: days(cachedUpTo, req.today), ms: performance.now() - t };
}
