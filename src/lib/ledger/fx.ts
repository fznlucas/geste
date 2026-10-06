/**
 * USD → EUR (docs/admin-v2/02 §4): the config's base rate with a deterministic daily drift of at most
 * ±0.3 %, the same on every machine. The live adapter later reads the rate of each Stripe balance transaction.
 */
import { BUSINESS } from "@/config/business";
import { hashString } from "@/sim/random";

const cache = new Map<string, number>();

/** EUR for 1 USD on a Paris day. */
export function fxRate(day: string): number {
  let r = cache.get(day);
  if (r === undefined) {
    const { eurPerUsd, dailyDriftPct } = BUSINESS.fx.value;
    const u = (hashString(`fx|${day}`) % 10_001) / 10_000; // 0…1
    r = Math.round(eurPerUsd * (1 + ((u * 2 - 1) * dailyDriftPct) / 100) * 1e6) / 1e6;
    cache.set(day, r);
  }
  return r;
}

/** USD cents → EUR cents at a rate. */
export const toEur = (usdCents: number, rate: number) => Math.round(usdCents * rate);
