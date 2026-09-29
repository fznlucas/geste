/**
 * Analytics and finance (owner only). Mock: the boards' figures from `src/data/insights.ts`.
 * Later: the PostHog query API (analytics) and `v_pnl_monthly` + the Stripe balance (finance).
 */
import {
  DIRECT_COSTS, analyticsByRange, completionDrops, completionN03, devices, levelMix, payouts, pnlSeptember, repeatRate, turnover2026, vatQ3,
  type AnalyticsRange,
} from "@/data/insights";
import { clone } from "./clone";

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

export async function getAnalytics(range: AnalyticsRange = "30 days"): Promise<Analytics> {
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
}

export interface PnlRow {
  label: string;
  /** Negative for costs. */
  cents: number;
  /** Share of revenue, whole percent (revenue lines and totals). */
  sharePct: number | null;
  total: boolean;
  /** Costs are written with a minus even at $0 ("−$0"). */
  cost: boolean;
}

export interface Finance {
  month: string;
  revenueCents: number;
  grossMarginCents: number;
  grossMarginPct: number;
  /** Costs after the gross margin ("Costs · Sept · see below"). */
  costsCents: number;
  netCents: number;
  netPct: number;
  nextPayout: { date: string; cents: number } | null;
  pnl: PnlRow[];
  vat: Array<{ country: string; rate: string; cents: number | null }>;
  turnover: { cents: number; thresholdCents: number | null; pct: number };
  payouts: Array<{ id: string; date: string; cents: number; status: "scheduled" | "paid" }>;
}

export async function getFinance(): Promise<Finance> {
  const revenue = pnlSeptember.filter((l) => l.kind === "revenue");
  const costs = pnlSeptember.filter((l) => l.kind === "cost");
  const revenueCents = revenue.reduce((s, l) => s + l.cents, 0);
  const direct = costs.slice(0, DIRECT_COSTS);
  const other = costs.slice(DIRECT_COSTS);
  const grossMarginCents = revenueCents - direct.reduce((s, l) => s + l.cents, 0);
  const costsCents = other.reduce((s, l) => s + l.cents, 0);
  const netCents = grossMarginCents - costsCents;
  const pct = (c: number) => Math.round((c / revenueCents) * 100);
  const line = (label: string, cents: number, sharePct: number | null, total = false, cost = false): PnlRow => ({ label, cents, sharePct, total, cost });
  const next = payouts.find((p) => p.status === "scheduled");
  const threshold = turnover2026.thresholdCents ?? turnover2026.placeholderThresholdCents;
  return clone({
    month: "September",
    revenueCents,
    grossMarginCents,
    grossMarginPct: pct(grossMarginCents),
    costsCents,
    netCents,
    netPct: pct(netCents),
    nextPayout: next ? { date: next.date, cents: next.cents } : null,
    pnl: [
      ...revenue.map((l) => line(l.label, l.cents, pct(l.cents))),
      line("Revenue", revenueCents, 100, true),
      ...direct.map((l) => line(l.label, -l.cents, null, false, true)),
      line("Gross margin", grossMarginCents, pct(grossMarginCents), true),
      ...other.map((l) => line(l.label, -l.cents, null, false, true)),
      line("Net result", netCents, pct(netCents), true),
    ],
    vat: vatQ3,
    turnover: { cents: turnover2026.cents, thresholdCents: turnover2026.thresholdCents, pct: Math.round((turnover2026.cents / threshold) * 100) },
    payouts,
  });
}

/** "Export for accountant (CSV)": the P&L, VAT and payouts, one table per block. */
export function financeCsv(f: Finance): string {
  const money = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows: string[][] = [
    ["Profit & loss", f.month + " 2026", "USD"],
    ["Line", "Amount", "Share %"],
    ...f.pnl.map((r) => [r.label, money(r.cents), r.sharePct === null ? "" : String(r.sharePct)]),
    [],
    ["VAT collected", "Q3 2026", ""],
    ["Country", "Rate", "Amount"],
    ...f.vat.map((v) => [v.country, v.rate, money(v.cents)]),
    [],
    ["Payouts", "", ""],
    ["Date", "Amount", "Status"],
    ...f.payouts.map((p) => [p.date, money(p.cents), p.status]),
  ];
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}
