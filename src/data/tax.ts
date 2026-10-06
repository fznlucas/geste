/**
 * Mock VAT rates by shipping/billing country (Stripe Tax computes them in production). VAT is
 * included in every price: the checkout shows the included part ("Including VAT $10.67").
 */
/**
 * Switzerland and every country outside the EU are exports: 0 % (docs/admin-v2/02 §5, decided by Lucas
 * 2026-10-06). Prices are VAT-inclusive, so a rate only splits the total: no total changes with it.
 */
export const VAT_RATES: Record<string, number> = { FR: 0.2, BE: 0.21, DE: 0.19 };

/** VAT included in a VAT-inclusive total. */
export function includedVatCents(totalCents: number, country: string): number {
  const rate = VAT_RATES[country] ?? 0;
  return Math.round(totalCents - totalCents / (1 + rate));
}
