/**
 * Analytics metrics (AdminAnalytics, owner only), computed from the rows for each range: funnel and
 * sources from the traffic and the paid orders, completion from the library, devices, level mix and
 * repeat purchases. Later: the PostHog query API.
 */
import { addDays, simToday } from "@/lib/clock";
import { clone } from "@/lib/api/clone";
import { allEntitlements, allWorks } from "@/lib/api/local";
import { guides } from "@/data/guides";
import { metric } from "./define";
import { rollingDays, type Period } from "./period";
import { devicesPct, funnel, levelMixPct, ordersBySource, repeatRatePct } from "./sales";

export type AnalyticsRange = "7 days" | "30 days" | "90 days" | "Year";

const RANGE_DAYS: Record<AnalyticsRange, number> = { "7 days": 7, "30 days": 30, "90 days": 90, Year: 365 };

/** The period of an analytics range, ending today. */
export const analyticsPeriod = (range: AnalyticsRange): Period => rollingDays(RANGE_DAYS[range]);

/** Under this many painters, the completion drops are noise more than signal. */
export const SMALL_SAMPLE_READERS = 100;

export const ANALYTICS_RANGES: AnalyticsRange[] = ["7 days", "30 days", "90 days", "Year"];

export interface Analytics {
  range: AnalyticsRange;
  funnel: Array<{ label: string; value: number }>;
  /** "Biggest leak: work → cart (11.8%)": the step with the lowest conversion from the one before. */
  leak: { from: string; to: string; pct: number };
  sources: Array<{ label: string; orders: number }>;
  /** `readers`: the painters counted; under 100 the page says it is a small sample. */
  completion: { workNumber: string; readers: number; steps: Array<{ step: string; pct: number; drop: { points: number; reason: string } | null }> };
  devices: Array<{ label: string; pct: number }>;
  levelMix: Array<{ label: string; pct: number }>;
  repeat: { pct: number; context: string };
}

const LEAK_NAMES: Record<string, string> = { Visits: "visit", "Viewed a work": "work", "Added to cart": "cart", "Started checkout": "checkout", Paid: "paid" };

/** Definitions shown next to each analytics block (docs/admin-v2/06 §2). */
export const ANALYTICS_DEFINITIONS = {
  funnel: funnel.definition,
  leak: "The funnel step with the lowest rate from the step before.",
  sources: ordersBySource.definition,
  completion: "Buyers of the work's guide who opened it at least 14 days ago: share who reached each step.",
  devices: devicesPct.definition,
  levelMix: levelMixPct.definition,
  repeat: repeatRatePct.definition,
} as const;

/** Why a step loses painters, where the board explains it. */
const DROP_REASONS: Record<string, string> = { "2a": "2a is the first big gesture", "2e": "2e is the long drying wait" };
const STEP_IDS = [1, 2, 3].flatMap((l) => ["a", "b", "c", "d", "e"].map((x) => `${l}${x}`));

/** Share of a work's buyers (15-step guides, opened ≥ 14 days ago) who reached each step. */
export const completion = metric("Buyers of the work's guide who opened it at least 14 days ago: share who reached each step.", function completion(workNumber = "N°03") {
  const work = allWorks().find((w) => w.number === workNumber);
  const guideIds = new Set(guides.filter((g) => g.workId === work?.id && g.level !== "beginner").map((g) => g.id));
  const cutoff = addDays(simToday(), -14);
  const painters = allEntitlements().filter((e) => guideIds.has(e.guideId) && e.openedAt && e.openedAt.slice(0, 10) <= cutoff && !e.revokedAt);
  const reached = STEP_IDS.map((_, i) => painters.filter((e) => e.progress.completedAt || STEP_IDS.indexOf(e.progress.step) >= i).length);
  const pct = reached.map((n) => (painters.length ? Math.round((n / painters.length) * 100) : 0));
  const drops = pct.map((p, i) => (i ? pct[i - 1]! - p : 0));
  const biggest = new Set([...drops.keys()].sort((a, b) => drops[b]! - drops[a]!).slice(0, 2).filter((i) => drops[i]! > 0));
  return {
    workNumber,
    readers: painters.length,
    steps: STEP_IDS.map((step, i) => ({ step, pct: pct[i]!, drop: biggest.has(i) ? { points: drops[i]!, reason: DROP_REASONS[step] ?? `${step} loses painters` } : null })),
  };
});

/** Every analytics block for a range. */
export const analytics = metric("Analytics figures for a range: funnel, biggest leak, sources, completion, devices, level mix, repeat rate.", async function analytics(range: AnalyticsRange = "30 days"): Promise<Analytics> {
  const period = analyticsPeriod(range);
  const steps = funnel(period);
  const conv = steps.slice(1).map((f, i) => ({ from: steps[i]!.label, to: f.label, pct: steps[i]!.value ? (f.value / steps[i]!.value) * 100 : 0 }));
  const worst = conv.reduce((a, b) => (b.pct < a.pct ? b : a));
  return clone({
    range,
    funnel: steps,
    leak: { from: LEAK_NAMES[worst.from] ?? worst.from, to: LEAK_NAMES[worst.to] ?? worst.to, pct: Math.round(worst.pct * 10) / 10 },
    sources: ordersBySource(period),
    completion: completion("N°03"),
    devices: devicesPct(period),
    levelMix: levelMixPct(period),
    repeat: { pct: repeatRatePct(), context: "of first-time buyers bought a 2nd guide within 60 days" },
  });
});
