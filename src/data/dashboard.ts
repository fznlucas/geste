/**
 * Store aggregates of the dashboard (AdminDashboard, AdminMToday): what `v_daily_revenue`, PostHog and
 * the affiliate stats return later. They are the whole store's numbers, the mock orders included;
 * orders placed in this browser (dated from the mock's today, Oct 2) are added on top by the API.
 */

export interface DailyRevenueRow {
  day: string; // "2026-09-22"
  revenueCents: number;
  orders: number;
}

/**
 * September as drawn on the board (relative bar heights, Sep 22 spike), scaled so the month adds up
 * to the board's KPI tiles: $4,212 and 187 orders (the board's own bars add up to $2,857).
 */
const SEPTEMBER_SHAPE = [58, 47, 84, 45, 79, 69, 49, 83, 51, 81, 57, 60, 85, 115, 68, 76, 107, 131, 106, 96, 138, 310, 133, 95, 86, 86, 101, 139, 96, 126];

/** Shapes for July and August (no board): a slow rise, a dip mid-August. */
const JULY_SHAPE = [40, 36, 52, 44, 38, 61, 47, 42, 55, 39, 50, 46, 58, 43, 49, 64, 41, 53, 48, 57, 45, 60, 51, 44, 66, 49, 55, 47, 62, 50, 58];
const AUGUST_SHAPE = [52, 48, 63, 55, 47, 71, 58, 50, 66, 45, 41, 38, 44, 49, 53, 60, 57, 68, 62, 55, 73, 64, 59, 70, 66, 61, 78, 69, 74, 80, 72];

/** Splits `total` over the days in proportion to `shape`, rounding so the parts add up exactly. */
function spread(shape: number[], total: number): number[] {
  const sum = shape.reduce((s, v) => s + v, 0);
  const raw = shape.map((v) => (v * total) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    out[i]! += 1;
  }
  return out;
}

function month(year: number, m: number, shape: number[], revenueCents: number, orders: number, firstDay = 1): DailyRevenueRow[] {
  const rev = spread(shape, revenueCents / 100).map((d) => d * 100);
  const ord = spread(shape, orders);
  return shape.map((_, i) => ({ day: `${year}-${String(m).padStart(2, "0")}-${String(firstDay + i).padStart(2, "0")}`, revenueCents: rev[i]!, orders: ord[i]! }));
}

/**
 * Jul 1 → Sep 30. August: $3,052 and 133 orders, so September reads "+38% vs Aug", orders "+41%",
 * average order "−2%" as on the board.
 */
export const dailyRevenue: DailyRevenueRow[] = [
  ...month(2026, 7, JULY_SHAPE, 241_000, 108),
  ...month(2026, 8, AUGUST_SHAPE, 305_200, 133),
  ...month(2026, 9, SEPTEMBER_SHAPE, 421_200, 187),
];

/** Chart annotations ("Sep 22 · TikTok “first canvas” ep. 04 posted"). */
export const chartNotes: Array<{ day: string; text: string }> = [{ day: "2026-09-22", text: "TikTok “first canvas” ep. 04 posted" }];

/** The other 30-day tiles (PostHog, reader progress, affiliate clicks). */
export const last30d = {
  /** Conversion (paid / visits), and the change against the 30 days before, in points. */
  conversionPct: 2.8,
  conversionDeltaPt: 0.6,
  /** Guides finished / guides started. */
  guidesFinishedPct: 61,
  /** Affiliate commission on shopping lists. */
  affiliateCents: 31_800,
};

/** Today (AdminMToday "Today · Oct 2"), up to the mock's now. */
export const today = {
  day: "2026-10-02",
  revenueCents: 21_400,
  orders: 11,
  guides: 8,
  prints: 3,
  /** Same weekday last week is not there yet: the board compares with Tuesday. */
  compareLabel: "Tue",
  compareRevenueCents: 17_500,
  visitors: 386,
  phonePct: 71,
  conversionPct: 2.8,
  conversionDeltaPt: 0,
};

/**
 * Guides sold per work over the last 30 days (Top works). The five on the board, then the others.
 * All-time sales (`HISTORICAL_SALES`, the catalog's "62 sold") are a different number.
 */
export const guidesSold30d: Record<string, number> = {
  n03: 62, n01: 48, n07: 31, n02: 22, n05: 14,
  n12: 9, n14: 8, n04: 7, n08: 6, n06: 5, n11: 4, n15: 3, n13: 2, n09: 0, n10: 0,
};
