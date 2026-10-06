/**
 * Which VAT rate applies to a sale (docs/decisions.md "EU VAT", decided by Lucas 2026-10-06, to confirm
 * with the accountant):
 * - France: 20 %.
 * - Other EU countries, consumers: French VAT (20 %) while the calendar year's EU distance sales and
 *   electronic services stay under €10,000; once a sale passes the threshold, the sales after it take
 *   the buyer's country rate (OSS registration needed: an alert says so).
 * - Switzerland and outside the EU: exports, 0 %.
 * - Under the VAT franchise ("TVA non applicable, art. 293 B du CGI"): no VAT at all.
 * Totals never change: only the VAT part of a VAT-inclusive price.
 */
import { BUSINESS, type VatRegime } from "@/config/business";
import { parisDay } from "@/lib/clock";
import { FR_VAT_RATE, VAT_RATES } from "@/data/tax";
import { fxRate, toEur } from "@/lib/ledger/fx";
import { allOrders, patched } from "./local";

export const EU_COUNTRIES = new Set(Object.keys(VAT_RATES));

/** The VAT regime in force: Settings › Payments & tax (admin overlay), else the config's. */
export function vatRegime(): VatRegime {
  const row = patched("business_settings", { id: "vat_regime", value: BUSINESS.vatRegime.value as string });
  return row.value === "franchise" ? "franchise" : "collect";
}

let memo: { orders: unknown; crossed: Map<string, string> } | null = null;

/** Per calendar year, the payment time of the sale that passed the EU €10,000 threshold. */
export function euThresholdCrossings(): Map<string, string> {
  const orders = allOrders();
  if (memo?.orders === orders) return memo.crossed;
  const limit = BUSINESS.thresholds.euCrossBorder.value.limitCents;
  const crossed = new Map<string, string>();
  const sums = new Map<string, number>();
  const sorted = orders
    .filter((o) => o.status !== "pending" && o.status !== "cancelled")
    .map((o) => ({ o, country: o.country ?? o.shippingAddress?.country ?? "" }))
    .filter((x) => x.country !== "FR" && EU_COUNTRIES.has(x.country))
    .sort((a, b) => (a.o.paidAt < b.o.paidAt ? -1 : 1));
  for (const { o } of sorted) {
    const year = parisDay(o.paidAt).slice(0, 4);
    if (crossed.has(year)) continue;
    // Below the threshold every one of these sales carried French VAT.
    const exVat = Math.round(toEur(o.totalCents, fxRate(parisDay(o.paidAt))) / (1 + FR_VAT_RATE));
    const sum = (sums.get(year) ?? 0) + exVat;
    sums.set(year, sum);
    if (sum >= limit) crossed.set(year, o.paidAt);
  }
  memo = { orders, crossed };
  return crossed;
}

/** The VAT rate of a sale to `country` paid at `at`. */
export function vatRateAt(country: string, at: string | number, regime: VatRegime = vatRegime()): number {
  if (regime === "franchise") return 0;
  if (country === "FR") return FR_VAT_RATE;
  if (!EU_COUNTRIES.has(country)) return 0;
  const iso = typeof at === "number" ? new Date(at).toISOString() : at;
  const crossedAt = euThresholdCrossings().get(parisDay(iso).slice(0, 4));
  return crossedAt && iso > crossedAt ? VAT_RATES[country]! : FR_VAT_RATE;
}
