/**
 * The history worker (docs/admin-v2/01 §2): brings the engine to today off the page's thread, from the
 * IndexedDB cache when it can, saves it, and hands the two JSON buffers to the page without a copy
 * (transferred). `fill: true`: only bring the cache up to date (the page already has the history).
 */
import { idbStore } from "./idb";
import { primeEngine, type PrimeRequest } from "./prime";

self.onmessage = async (e: MessageEvent<PrimeRequest & { fill?: boolean }>) => {
  try {
    const result = await primeEngine(e.data, e.data.key ? idbStore() : null);
    if (e.data.fill) self.postMessage({ ok: true, filled: true });
    else self.postMessage({ ok: true, result }, { transfer: [result.rows, result.state] });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
