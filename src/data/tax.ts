/**
 * VAT rates (Stripe Tax computes them in production). Prices are VAT-inclusive: a rate only splits the
 * total into its VAT part ("Including VAT $3.17"); no total ever changes with it.
 *
 * Which rate applies to a sale is decided by `vatRateAt` (src/lib/api/vat.ts, docs/decisions.md
 * "EU VAT"): France 20 %; other EU countries 20 % too until the year's EU sales to consumers pass
 * €10,000, then the buyer's country rate below (OSS); Switzerland and outside the EU are exports, 0 %.
 */
export const FR_VAT_RATE = 0.2;

/** Each EU country's standard rate, used once the €10,000 EU threshold is passed (OSS). */
export const VAT_RATES: Record<string, number> = {
  FR: 0.2, BE: 0.21, DE: 0.19, NL: 0.21, ES: 0.21, IT: 0.22, AT: 0.2, PT: 0.23, IE: 0.23, LU: 0.17, DK: 0.25, SE: 0.25, FI: 0.255, PL: 0.23, CZ: 0.21, GR: 0.24,
};

/** VAT included in a VAT-inclusive total at a rate (default: France for France and the EU, 0 elsewhere). */
export function includedVatCents(totalCents: number, country: string, rate: number = country in VAT_RATES ? FR_VAT_RATE : 0): number {
  return Math.round(totalCents - totalCents / (1 + rate));
}
