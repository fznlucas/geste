/**
 * What the history cache is keyed on (docs/admin-v2/01 §2): the seed, the engine version and the
 * fingerprint of the sources the engine reads (src/sim, src/data, src/config, src/lib), computed at build
 * time by next.config.ts. Another seed, a config change or a new engine: another key, the old entry goes.
 * Bump ENGINE_VERSION by hand when the cached shape changes (SimSnapshot).
 */
export const ENGINE_VERSION = 1;

/** Set by next.config.ts at build time; empty in Node (tests, build) and in `next dev`. */
export const SIM_SOURCE_HASH = process.env.NEXT_PUBLIC_SIM_SOURCE_HASH ?? "";

/** The cache key of a seed, or null when nothing may be cached (dev server: its sources change under it). */
export function simCacheKey(seed: string): string | null {
  if (process.env.NODE_ENV === "development" || !SIM_SOURCE_HASH) return null;
  return `${seed}|engine-${ENGINE_VERSION}|${SIM_SOURCE_HASH}`;
}
