/**
 * The history worker (docs/admin-v2/01 §2): brings the engine to today off the page's thread, from the
 * IndexedDB cache when it can, and sends the engine state back (structured clone).
 */
import { idbStore } from "./idb";
import { primeEngine, type PrimeRequest } from "./prime";

self.onmessage = async (e: MessageEvent<PrimeRequest>) => {
  try {
    const result = await primeEngine(e.data, e.data.key ? idbStore() : null);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
