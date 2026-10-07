/**
 * A fingerprint of a generated history (docs/admin-v2/01 §2): the same seed and engine must give the same
 * rows whether they were generated in one go, resumed from the cache or computed in the worker. 53-bit
 * cyrb53 over the rows in JSON (arrays of plain rows, oldest first, so the order is part of it).
 */
import type { SimRows } from "./types";

export function cyrb53(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** The history's fingerprint: every table of rows, in order. */
export function historyHash(rows: SimRows): string {
  return cyrb53(JSON.stringify(rows));
}
