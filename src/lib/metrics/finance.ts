/**
 * Finance metrics (AdminFinance, owner only). Admin v2 Phase 1: the temporary source is still the
 * board's September figures of `src/data/insights.ts`; Phase 3 computes them from the ledger, in EUR
 * excluding VAT. Later: `v_pnl_monthly` + the Stripe balance.
 */
import { DIRECT_COSTS, payouts, pnlSeptember, turnover2026, vatQ3 } from "@/data/insights";
import { clone } from "@/lib/api/clone";
import { metric } from "./define";

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

/** Definitions shown next to each finance figure (docs/admin-v2/06 §2). */
export const FINANCE_DEFINITIONS = {
  revenue: "Revenue lines of the month: guides, prints, gift cards and affiliate commissions.",
  grossMargin: "Revenue minus the direct costs (VAT, print production, labels, payment fees).",
  net: "Gross margin minus the other costs of the month.",
  turnover: "Turnover of the calendar year against the micro-enterprise threshold.",
} as const;

/** P&L, VAT, turnover threshold and payouts of the month. */
export const finance = metric("Finance figures of the month: P&L, gross margin, net result, VAT by country, turnover threshold, payouts.", async function finance(): Promise<Finance> {
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
});

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
