/**
 * Analytics metrics (AdminAnalytics, owner only). Admin v2 Phase 1: the temporary source is still the
 * board's figures of `src/data/insights.ts`; Phase 2 computes them from the simulated traffic, orders
 * and reader progress. Later: the PostHog query API.
 */
import { analyticsByRange, completionDrops, completionN03, devices, levelMix, repeatRate, type AnalyticsRange } from "@/data/insights";
import { clone } from "@/lib/api/clone";
import { metric } from "./define";

export type { AnalyticsRange };
export const ANALYTICS_RANGES: AnalyticsRange[] = ["7 days", "30 days", "90 days", "Year"];

export interface Analytics {
  range: AnalyticsRange;
  funnel: Array<{ label: string; value: number }>;
  /** "Biggest leak: work → cart (11.8%)": the step with the lowest conversion from the one before. */
  leak: { from: string; to: string; pct: number };
  sources: Array<{ label: string; orders: number }>;
  completion: { workNumber: string; steps: Array<{ step: string; pct: number; drop: { points: number; reason: string } | null }> };
  devices: Array<{ label: string; pct: number }>;
  levelMix: Array<{ label: string; pct: number }>;
  repeat: { pct: number; context: string };
}

const STEP_IDS = [1, 2, 3].flatMap((l) => ["a", "b", "c", "d", "e"].map((s) => `${l}${s}`));
const LEAK_NAMES: Record<string, string> = { Visits: "visit", "Viewed a work": "work", "Added to cart": "cart", "Started checkout": "checkout", Paid: "paid" };

/** Definitions shown next to each analytics block (docs/admin-v2/06 §2). */
export const ANALYTICS_DEFINITIONS = {
  funnel: "Visits, then visitors who viewed a work, added to cart, started checkout and paid, same period.",
  leak: "The funnel step with the lowest rate from the step before.",
  sources: "Paid orders by the source of the visit that led to them.",
  completion: "Share of buyers of the guide who reached each step.",
  devices: "Share of visits by device.",
  levelMix: "Share of guides sold by level.",
  repeat: "First-time buyers who bought a second guide within 60 days.",
} as const;

/** Every analytics block for a range. */
export const analytics = metric("Analytics figures for a range: funnel, biggest leak, sources, completion, devices, level mix, repeat rate.", async function analytics(range: AnalyticsRange = "30 days"): Promise<Analytics> {
  const row = analyticsByRange.find((r) => r.range === range)!;
  const conv = row.funnel.slice(1).map((f, i) => ({ from: row.funnel[i]!.label, to: f.label, pct: (f.value / row.funnel[i]!.value) * 100 }));
  const worst = conv.reduce((a, b) => (b.pct < a.pct ? b : a));
  return clone({
    range,
    funnel: row.funnel,
    leak: { from: LEAK_NAMES[worst.from] ?? worst.from, to: LEAK_NAMES[worst.to] ?? worst.to, pct: Math.round(worst.pct * 10) / 10 },
    sources: row.sources,
    completion: {
      workNumber: "N°03",
      steps: completionN03.map((pct, i) => {
        const d = completionDrops.find((x) => x.step === STEP_IDS[i]);
        return { step: STEP_IDS[i]!, pct, drop: d ? { points: d.points, reason: d.reason } : null };
      }),
    },
    devices,
    levelMix,
    repeat: repeatRate,
  });
});
