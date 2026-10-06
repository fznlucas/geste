/**
 * Money invariants of the books (docs/admin-v2/07 "Money"), at three clock values: Oct 2, 2026 12:00
 * (the e2e clock), today, and Mar 15, 2027 18:00. Each clock loads the app's modules afresh.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const CLOCKS = ["2026-10-02T12:00:00Z", new Date().toISOString(), "2027-03-15T18:00:00Z"];

async function at(iso: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SIM_NOW", iso);
  const ledger = await import("@/lib/ledger");
  const fin = await import("@/lib/metrics/finance");
  const dash = await import("@/lib/metrics/dashboard");
  const period = await import("@/lib/metrics/period");
  const local = await import("@/lib/api/local");
  const clock = await import("@/lib/clock");
  return { ledger, fin, dash, period, local, clock };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

const months = (to: string) => {
  const out: string[] = [];
  for (let y = 2026, m = 7; `${y}-${String(m).padStart(2, "0")}` <= to.slice(0, 7); m === 12 ? ((m = 1), y++) : m++) out.push(`${y}-${String(m).padStart(2, "0")}`);
  return out;
};

describe.each(CLOCKS)("the books at %s", (iso) => {
  it("ledger revenue = P&L turnover = URSSAF turnover, every month (exact)", async () => {
    const { ledger, fin } = await at(iso);
    for (const m of months(iso)) {
      const f = await fin.finance(m);
      const lines = fin.linesIn(f.period);
      const ledgerSum = lines.filter((l) => ledger.TURNOVER_ACCOUNTS.includes(l.account)).reduce((s, l) => s + l.amountEurCents, 0);
      const urssaf = Object.values(ledger.turnoverByCategory(lines)).reduce((s, v) => s + v, 0);
      expect(f.revenueCents, m).toBe(ledgerSum);
      expect(urssaf, m).toBe(ledgerSum);
      expect(f.pnl.find((r) => r.key === "turnover")!.cents).toBe(ledgerSum);
    }
  });

  it("gross margin = turnover − direct costs; result = gross margin − overheads − contributions", async () => {
    const { fin } = await at(iso);
    for (const m of months(iso)) {
      const f = await fin.finance(m);
      const sumOf = (keys: string[]) => f.pnl.filter((r) => keys.includes(r.key)).reduce((s, r) => s + r.cents, 0);
      expect(f.grossMarginCents).toBe(f.revenueCents + sumOf(["print_production", "packaging", "labels", "payment_fees", "fx"]));
      expect(f.netCents).toBe(f.grossMarginCents + sumOf(["gpu", "software", "ads", "studio", "bank"]));
      expect(f.resultAfterContributionsCents).toBe(f.netCents - f.contributionsCents);
      // Shares of the revenue lines add up to about 100 % (whole percents).
      const shares = f.pnl.filter((r) => !r.total && !r.cost && !r.memo && r.sharePct !== null).reduce((s, r) => s + r.sharePct!, 0);
      if (f.revenueCents > 0) expect(Math.abs(shares - 100)).toBeLessThanOrEqual(f.pnl.length);
    }
  });

  it("gift cards: owed ≤ sold − used − expired, never below zero, and equal to the card's balance, per card", async () => {
    const { ledger, local } = await at(iso);
    const now = Date.parse(iso);
    const lines = ledger.books().lines.filter((l) => l.account.startsWith("liability.giftcards") && Date.parse(l.at) <= now);
    const cards = local.allGiftCards();
    const byOrder = new Map(cards.filter((g) => g.purchaseOrderId).map((g) => [g.purchaseOrderId!, g]));
    const per = new Map<string, { sold: number; used: number; expired: number; owed: number }>();
    const of = (id: string) => per.get(id) ?? per.set(id, { sold: 0, used: 0, expired: 0, owed: 0 }).get(id)!;
    for (const l of lines) {
      const card = l.sourceTable === "orders" ? byOrder.get(l.sourceId)?.id : l.sourceId.split(":")[0];
      if (!card) continue; // a card bought in this browser (not in this test's rows)
      const c = of(card);
      c.owed += l.amountEurCents;
      if (l.sourceTable === "orders") c.sold += l.amountEurCents;
      else if (l.sourceTable === "gift_card_redemptions") c.used -= l.amountEurCents;
      else if (l.sourceTable === "gift_card_refunds") c.used -= l.amountEurCents; // paid back onto the card: used less
      else c.expired -= l.amountEurCents;
    }
    expect(per.size).toBeGreaterThan(0);
    for (const [id, c] of per) {
      expect(c.owed, id).toBeLessThanOrEqual(c.sold - c.used - c.expired);
      expect(c.owed, id).toBeGreaterThanOrEqual(0);
      // Counted once: what the books owe is what is left on the card (at the card's rate, to the cent).
      const card = cards.find((g) => g.id === id)!;
      const { parisDay } = await import("@/lib/clock");
      expect(c.owed, id).toBe(ledger.toEur(card.balanceCents, ledger.fxRate(parisDay(card.createdAt))));
    }
  });

  it("Stripe balance + payouts = payments net of fees − refunds", async () => {
    const { ledger } = await at(iso);
    const now = Date.parse(iso);
    const stripe = ledger.books().lines.filter((l) => l.account === "cash.stripe_balance" && Date.parse(l.at) <= now);
    const balance = stripe.reduce((s, l) => s + l.amountEurCents, 0);
    const paidOut = -stripe.filter((l) => l.sourceTable === "payouts").reduce((s, l) => s + l.amountEurCents, 0);
    const net = stripe.filter((l) => l.sourceTable === "orders").reduce((s, l) => s + l.amountEurCents, 0);
    const refunds = -stripe.filter((l) => l.sourceTable === "refunds").reduce((s, l) => s + l.amountEurCents, 0);
    expect(balance + paidOut).toBe(net - refunds);
    // Payouts never take more than was available.
    expect(balance).toBeGreaterThanOrEqual(Math.min(0, -refunds));
  });

  it("dashboard revenue = Finance store revenue = order-derived ledger lines, same days", async () => {
    const { ledger, fin, dash, period } = await at(iso);
    const d = await dash.dashboard(30);
    const p = period.rollingDays(30);
    const f = await fin.finance(`${p.from}..${p.to}`);
    const fromLines = fin.linesIn(p).filter((l) => ledger.STORE_ACCOUNTS.includes(l.account)).reduce((s, l) => s + l.amountEurCents, 0);
    expect(d.last30d.revenueCents).toBe(f.storeRevenueCents);
    expect(f.storeRevenueCents).toBe(fromLines);
    // The chart's days add up to the same.
    const chart = d.days.slice(-30).reduce((s, x) => s + x.revenueCents, 0);
    expect(chart).toBe(fromLines);
  });

  it("VAT collected − VAT paid = VAT due, and cash shows it", async () => {
    const { ledger, fin } = await at(iso);
    const now = Date.parse(iso);
    const vat = ledger.books().lines.filter((l) => l.account === "liability.vat" && Date.parse(l.at) <= now);
    const collected = vat.filter((l) => l.sourceTable !== "vat_returns").reduce((s, l) => s + l.amountEurCents, 0);
    const paid = -vat.filter((l) => l.sourceTable === "vat_returns").reduce((s, l) => s + l.amountEurCents, 0);
    const c = fin.cash();
    expect(collected - paid).toBe(c.vatDueCents);
    expect(c.availableCents).toBe(c.bankCents - c.vatDueCents - c.urssafDueCents);
    for (const r of ledger.books().vatReturns) if (r.paidAt) expect(r.status).toBe("paid");
  });

  it("URSSAF contributions follow the rates by category", async () => {
    const { ledger } = await at(iso);
    for (const decl of ledger.books().declarations) {
      const c = ledger.contributionsOf(decl.turnoverByCategory);
      expect(c.sales_goods.urssaf).toBe(Math.round((Math.max(0, decl.turnoverByCategory.sales_goods) * 12.3) / 100));
      expect(c.services_bic.urssaf).toBe(Math.round((Math.max(0, decl.turnoverByCategory.services_bic) * 21.2) / 100));
      if (decl.paidAt) expect(decl.status).toBe("paid");
    }
  });
});

describe("VAT", () => {
  it("EU consumers: French VAT under €10,000 a year, the buyer's rate (OSS) for the sales after", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SIM_NOW", "2026-10-02T12:00:00Z");
    const vat = await import("@/lib/api/vat");
    expect(vat.vatRateAt("FR", "2026-09-01T10:00:00Z")).toBe(0.2);
    expect(vat.vatRateAt("BE", "2026-09-01T10:00:00Z")).toBe(0.2); // under the threshold: French VAT
    expect(vat.vatRateAt("DE", "2026-09-01T10:00:00Z")).toBe(0.2);
    expect(vat.vatRateAt("CH", "2026-09-01T10:00:00Z")).toBe(0);
    expect(vat.vatRateAt("US", "2026-09-01T10:00:00Z")).toBe(0);
    expect(vat.vatRateAt("BE", "2026-09-01T10:00:00Z", "franchise")).toBe(0);
    // Later years pass the threshold: from the sale that crosses it, the buyer's country rate.
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SIM_NOW", "2028-12-31T20:00:00Z");
    const later = await import("@/lib/api/vat");
    const crossed = later.euThresholdCrossings();
    for (const [year, iso] of crossed) {
      expect(later.vatRateAt("BE", iso)).toBe(0.2);
      expect(later.vatRateAt("BE", new Date(Date.parse(iso) + 1000).toISOString())).toBe(0.21);
      expect(later.vatRateAt("DE", `${Number(year) + 1}-01-01T12:00:00Z`)).toBe(0.2); // a new year starts under it
    }
  });

  it("Switzerland and outside the EU are exports: 0 % — and no order total depends on a rate", async () => {
    const { includedVatCents, VAT_RATES } = await import("@/data/tax");
    const { orders } = await import("@/data/orders");
    expect(includedVatCents(1900, "CH")).toBe(0);
    expect(includedVatCents(1900, "US")).toBe(0);
    expect(VAT_RATES.FR).toBe(0.2);
    for (const o of orders) expect(o.totalCents).toBe(o.subtotalCents - o.discountCents + o.shippingCents);
    for (const o of orders.filter((x) => x.shippingAddress?.country === "CH" || x.userId.match(/hugo|tom|chloe|nina|maya/))) expect(o.taxCents).toBe(0);
  });

  it("under the franchise: no VAT line, turnover = amount received", async () => {
    const { ledgerFromOrder } = await import("@/lib/ledger/derive");
    const { orders } = await import("@/data/orders");
    const o = orders.find((x) => x.id === "order-2041")!;
    const collect = ledgerFromOrder(o, undefined, "FR", "collect");
    const franchise = ledgerFromOrder(o, undefined, "FR", "franchise");
    expect(franchise.some((l) => l.account === "liability.vat")).toBe(false);
    const rev = (ls: typeof collect) => ls.filter((l) => l.account.startsWith("revenue.")).reduce((s, l) => s + l.amountEurCents, 0);
    const vat = collect.filter((l) => l.account === "liability.vat").reduce((s, l) => s + l.amountEurCents, 0);
    expect(rev(franchise)).toBe(rev(collect) + vat);
    expect(collect.some((l) => l.memo === "Stripe Tax")).toBe(true);
    expect(franchise.some((l) => l.memo === "Stripe Tax")).toBe(false);
  });

  it("the FEC export has the 18 standard columns", async () => {
    vi.stubEnv("NEXT_PUBLIC_SIM_NOW", "2026-10-02T12:00:00Z");
    vi.resetModules();
    const fin = await import("@/lib/metrics/finance");
    const f = await fin.finance("2026-09");
    const rows = fin.financeFec(f).trim().split("\r\n").map((r) => r.split("\t"));
    expect(rows[0]).toHaveLength(18);
    expect(rows[0]![0]).toBe("JournalCode");
    for (const r of rows) expect(r).toHaveLength(18);
    expect(rows.length - 1).toBe(fin.linesIn(f.period).length);
  });
});
