/**
 * Analytics (AdminAnalytics) and finance (AdminFinance) figures of the mock. Later: the PostHog API
 * for analytics, `v_pnl_monthly` + the Stripe balance for finance. Numbers are the boards' own; they
 * describe the whole store, not only the few mock orders (docs/decisions.md "Admin growth pages").
 */

export type AnalyticsRange = "7 days" | "30 days" | "90 days" | "Year";

export interface AnalyticsRangeRow {
  range: AnalyticsRange;
  funnel: Array<{ label: string; value: number }>;
  sources: Array<{ label: string; orders: number }>;
}

const FUNNEL_30 = [
  { label: "Visits", value: 6680 },
  { label: "Viewed a work", value: 3410 },
  { label: "Added to cart", value: 402 },
  { label: "Started checkout", value: 251 },
  { label: "Paid", value: 187 },
];
const SOURCES_30 = [
  { label: "TikTok", orders: 92 },
  { label: "Instagram", orders: 41 },
  { label: "Direct", orders: 27 },
  { label: "Google", orders: 16 },
  { label: "Newsletter", orders: 11 },
];

/** Other ranges scale the 30-day figures (7 d = the last week of September; 90 d and the year include the slower summer). */
const scaled = (range: AnalyticsRange, k: number): AnalyticsRangeRow => ({
  range,
  funnel: FUNNEL_30.map((f) => ({ ...f, value: Math.round(f.value * k) })),
  sources: SOURCES_30.map((s) => ({ ...s, orders: Math.round(s.orders * k) })),
});

export const analyticsByRange: AnalyticsRangeRow[] = [
  scaled("7 days", 0.27),
  { range: "30 days", funnel: FUNNEL_30, sources: SOURCES_30 },
  scaled("90 days", 2.1),
  scaled("Year", 3.4),
];

/** Guide completion of N°03: % of buyers who reached each of the 15 steps (1a … 3e). */
export const completionN03 = [100, 97, 94, 93, 90, 84, 82, 80, 78, 71, 69, 66, 65, 63, 61];
/** Steps whose drop is explained on the board, with the reason. */
export const completionDrops = [
  { step: "2a", points: 6, reason: "2a is the first big gesture" },
  { step: "2e", points: 7, reason: "2e is the long drying wait" },
];

export const devices = [
  { label: "Phone", pct: 71 },
  { label: "Desktop", pct: 24 },
  { label: "Tablet", pct: 5 },
];

export const levelMix = [
  { label: "Beginner", pct: 58 },
  { label: "Intermediate", pct: 31 },
  { label: "Advanced", pct: 11 },
];

export const repeatRate = { pct: 24, context: "of first-time buyers bought a 2nd guide within 60 days" };

// ── Finance ─────────────────────────────────────────────────────────────────

export interface PnlLine {
  label: string;
  cents: number;
  kind: "revenue" | "cost" | "total";
}

/** `v_pnl_monthly`, September 2026. Totals are recomputed by the API from the lines. */
export const pnlSeptember: PnlLine[] = [
  { label: "Guides", cents: 326400, kind: "revenue" },
  { label: "Prints", cents: 155800, kind: "revenue" },
  { label: "Gift cards sold", cents: 33200, kind: "revenue" },
  { label: "Affiliate commissions (shopping lists)", cents: 31800, kind: "revenue" },
  // Revenue is VAT included (KPI "VAT incl."): the VAT paid back comes off before the gross margin.
  // Not drawn on AdminFinance, whose gross margin only adds up with it (docs/decisions.md).
  { label: "VAT to pay back", cents: 72900, kind: "cost" },
  { label: "Print production (paper, ink, tubes)", cents: 28600, kind: "cost" },
  { label: "Shipping labels", cents: 12100, kind: "cost" },
  { label: "Payment fees (Stripe, PayPal)", cents: 18100, kind: "cost" },
  { label: "GPU (AI pipeline)", cents: 3800, kind: "cost" },
  { label: "Software (store, Claude, email)", cents: 9600, kind: "cost" },
  { label: "Ads", cents: 0, kind: "cost" },
  { label: "Materials for studio tests", cents: 47800, kind: "cost" },
];
/** The first four costs make the gross margin; the others come after it ("Costs · Sept"). */
export const DIRECT_COSTS = 4;

export const vatQ3 = [
  { country: "France", rate: "20%", cents: 182100 as number | null },
  { country: "Belgium · OSS", rate: "21%", cents: 12500 as number | null },
  { country: "Switzerland", rate: "n/a", cents: null as number | null },
  { country: "Germany · OSS", rate: "19%", cents: 5300 as number | null },
];

/**
 * Turnover of the calendar year. The threshold is entered by the accountant (`site_settings`
 * 'finance.turnover_threshold_cents', null until then); meanwhile the bar uses the micro-enterprise
 * services ceiling of 2026 ($77,700 in the mock's dollars), which gives 31 % (the board's 24 % at the old prices).
 */
export const turnover2026 = { cents: 2393000, thresholdCents: null as number | null, placeholderThresholdCents: 7770000 };

export const payouts = [
  { id: "po_oct3", date: "2026-10-03", cents: 166800, status: "scheduled" as const },
  { id: "po_sep26", date: "2026-09-26", cents: 132400, status: "paid" as const },
  { id: "po_sep19", date: "2026-09-19", cents: 83400, status: "paid" as const },
];
