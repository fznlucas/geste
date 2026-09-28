/**
 * Mock VAT rates by shipping/billing country (Stripe Tax computes them in production). VAT is
 * included in every price: the checkout shows the included part ("Including VAT $10.67").
 */
export const VAT_RATES: Record<string, number> = { FR: 0.2, BE: 0.21, CH: 0.081 };

/** VAT included in a VAT-inclusive total. */
export function includedVatCents(totalCents: number, country: string): number {
  const rate = VAT_RATES[country] ?? 0;
  return Math.round(totalCents - totalCents / (1 + rate));
}
