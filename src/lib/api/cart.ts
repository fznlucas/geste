/**
 * Cart pricing. The cart only stores what was chosen (work, format, level, palette, edition, gift
 * amount), never a price: every total is recomputed from `pricing.ts` and the catalog (./price-lines.ts)
 * with the live stock of the editions. On Supabase this is the body of `createPaymentIntent` (server);
 * in the mock it runs in the browser for display. Isomorphic and synchronous so the drawer can price on
 * every change.
 */
import { resolveLevel } from "@/lib/pricing";
import { works } from "@/data/works";
import { simNow } from "@/lib/clock";
import { editionSoldCount } from "./local";
import { vatRateAt } from "./vat";
import { priceLines, type PriceCartOptions } from "./price-lines";
import type { CartLineInput, PricedCart, StoredCartLine } from "./types";

export { GIFT_CARD_MAX, GIFT_CARD_MIN, GIFT_CARD_PRESETS, type PriceCartOptions } from "./price-lines";

/** Prices a cart. Unavailable lines (unpublished work, sold-out edition) are returned but not counted. */
export function priceCart(lines: StoredCartLine[], opts: PriceCartOptions = {}): PricedCart {
  // The VAT rate of a sale now (France, EU under or over the €10,000 threshold, export, franchise).
  const withVat = opts.country && opts.vatRate === undefined ? { ...opts, vatRate: vatRateAt(opts.country, simNow().getTime()) } : opts;
  // Copies taken so far, every source (pre-launch, fixtures, simulated, this browser).
  return priceLines(lines, withVat, (e) => ({ sold: editionSoldCount(e.id), reserved: e.reservedCount, open: e.open }));
}

/** Two inputs that are the same purchase: a guide config already in the cart, or the same edition. */
export function sameCartLine(a: CartLineInput, b: CartLineInput): boolean {
  if (a.kind === "guide" && b.kind === "guide") {
    const base = works.find((w) => w.id === a.workId)?.baseLevel ?? "intermediate";
    return a.workId === b.workId && a.format === b.format && resolveLevel(a, base) === resolveLevel(b, base) && a.palette === b.palette;
  }
  if (a.kind === "print" && b.kind === "print") return a.editionId === b.editionId;
  return false; // gift cards are always separate lines
}
