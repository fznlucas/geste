/**
 * Deterministic randomness of the simulation (docs/admin-v2/01 §2): the same seed and day give the
 * same numbers on every machine. mulberry32 for the stream; integer hashing for the seeds; no trig,
 * so the only float functions are Math.log/Math.exp (fdlibm ports in V8, identical everywhere).
 */

/** 32-bit hash of a string (cyrb53, folded). */
export function hashString(s: string): number {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** Weight tables already read (static config objects mostly). */
const tables = new WeakMap<object, { entries: ReadonlyArray<readonly [string | number, number]>; total: number }>();

export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** [0, 1) */
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both included. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  between(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]!;
  }

  /** One key of a weight table (weights need not sum to 1). Tables are read once and remembered. */
  weighted<K extends string | number>(weights: Readonly<Record<K, number>> | ReadonlyArray<readonly [K, number]>): K {
    let table = tables.get(weights);
    if (!table) {
      const entries = (Array.isArray(weights) ? weights : Object.entries(weights)) as Array<readonly [K, number]>;
      table = { entries, total: entries.reduce((s, [, w]) => s + w, 0) };
      tables.set(weights, table);
    }
    const entries = table.entries as Array<readonly [K, number]>;
    let r = this.next() * table.total;
    for (const [k, w] of entries) {
      r -= w;
      if (r < 0) return k;
    }
    return entries[entries.length - 1]![0];
  }

  /** Standard normal, Irwin–Hall (12 uniforms): no trig, plenty for business noise. */
  normal(): number {
    let s = 0;
    for (let i = 0; i < 12; i++) s += this.next();
    return s - 6;
  }

  /** Multiplicative noise around 1 (log-normal with median 1). */
  lognormal(sigma: number): number {
    return Math.exp(sigma * this.normal());
  }

  /** Poisson count (Knuth below 30, normal approximation above). */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda >= 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * this.normal()));
    const l = Math.exp(-lambda);
    let k = 0, p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > l);
    return k - 1;
  }

  /** Shuffle in place (Fisher–Yates). */
  shuffle<T>(list: T[]): T[] {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [list[i], list[j]] = [list[j]!, list[i]!];
    }
    return list;
  }
}

/** A stream for one purpose of one day: `rngFor(seed, "2026-09-22", "orders")`. */
export function rngFor(...keys: Array<string | number>): Rng {
  return new Rng(hashString(keys.join("|")));
}

/**
 * Splits an integer total in proportion to weights, so the parts add up exactly (largest remainder;
 * ties go to the earlier index).
 */
export function largestRemainder(weights: readonly number[], total: number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w * total) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    out[i]! += 1;
  }
  return out;
}
