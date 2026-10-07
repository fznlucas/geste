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
import { BUSINESS } from "@/config/business";
import { parisDay } from "@/lib/clock";
import { allOrders, editionSoldCount, editionStock, giftCardByCode } from "./local";
import { allPromos, promoUses } from "./marketing";
import { vatRateAt } from "./vat";
import { priceLines, promoEligible, type PriceCartOptions, type PromoRule, type StockReader } from "./price-lines";
import type { CartLineInput, PricedCart, StoredCartLine } from "./types";

export { GIFT_CARD_MAX, GIFT_CARD_MIN, GIFT_CARD_PRESETS, type PriceCartOptions } from "./price-lines";

/** Codes typed at checkout, and who buys (for "first order only"). */
export interface CartCodes {
  promoCode?: string | null;
  giftCardCode?: string | null;
  customerId?: string | null;
  email?: string | null;
}

// Copies taken so far, every source (pre-launch, fixtures, simulated, this browser).
const liveStock: StockReader = (e) => {
  const s = editionStock(e.id);
  return s ? { sold: s.sold, reserved: s.reserved, open: !s.closedByHand, editionSize: s.size, numbers: s.numbers, soldOut: s.soldOut } : { sold: editionSoldCount(e.id), reserved: e.reservedCount, open: e.open };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Dec 1" (Paris). */
const shortDay = (iso: string) => {
  const d = parisDay(iso);
  return `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
};

/** A gift card code, or a promo code? Gift cards are looked up first (their codes are "GESTE-…"). */
export const codeKind = (code: string): "gift_card" | "promo" => (giftCardByCode(code) ? "gift_card" : "promo");

/**
 * Is this promo code good for this cart now? The rules of Marketing: dates, maximum uses (counted from
 * orders), first order only, scope; never on a gift card. Returns the rule, or the precise reason.
 */
export function checkPromo(code: string, cart: PricedCart, who: Pick<CartCodes, "customerId" | "email"> = {}): { rule: PromoRule } | { reason: string } {
  const c = code.trim().toUpperCase();
  const row = allPromos().find((p) => p.code === c);
  if (!row) return { reason: "This code does not exist." };
  const now = simNow().toISOString();
  if (row.startsAt && row.startsAt > now) return { reason: `This code starts on ${shortDay(row.startsAt)}.` };
  if (row.endsAt && row.endsAt < now) return { reason: `This code expired on ${shortDay(row.endsAt)}.` };
  if (row.maxUses !== null && promoUses(row.code, now) >= row.maxUses) return { reason: "This code has been used up." };
  if (row.firstOrderOnly) {
    const email = who.email?.trim().toLowerCase();
    const ordered = allOrders().some((o) => o.status !== "pending" && o.status !== "cancelled" && ((who.customerId && o.userId === who.customerId) || (email && o.email?.toLowerCase() === email)));
    if (ordered) return { reason: "This code is for a first order only." };
  }
  const payable = cart.lines.filter((l) => l.unavailable === null);
  if (!payable.some((l) => promoEligible(l, row.scope))) {
    if (payable.length && payable.every((l) => l.kind === "gift_card")) return { reason: "Codes do not apply to gift cards." };
    if (row.scope === "guides") return { reason: "This code applies to guides: there is none in your cart." };
    if (row.scope === "prints") return { reason: "This code applies to prints: there is none in your cart." };
    return { reason: "This code does not apply to this cart." };
  }
  return { rule: { code: row.code, kind: row.kind, value: row.value, scope: row.scope, label: row.label } };
}

/**
 * A gift card as a means of payment: any part of its balance, never for another gift card; what is left
 * stays on the card. Returns what it pays, or the precise reason.
 */
export function checkGiftCard(code: string, cart: PricedCart): { id: string; code: string; cents: number; balanceAfterCents: number } | { reason: string } {
  const card = giftCardByCode(code);
  if (!card) return { reason: "This gift card code does not exist." };
  const expiry = new Date(card.createdAt);
  expiry.setUTCFullYear(expiry.getUTCFullYear() + BUSINESS.giftCardExpiryYears.value);
  if (expiry.getTime() < simNow().getTime()) return { reason: `This gift card expired on ${shortDay(expiry.toISOString())}.` };
  if (card.balanceCents <= 0) return { reason: "This gift card has been used up." };
  const giftLines = cart.lines.filter((l) => l.unavailable === null && l.kind === "gift_card").reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const payableByCard = cart.totals.totalCents - giftLines;
  if (payableByCard <= 0) return { reason: "A gift card cannot pay for another gift card." };
  const cents = Math.min(card.balanceCents, payableByCard);
  return { id: card.id, code: card.code, cents, balanceAfterCents: card.balanceCents - cents };
}

/**
 * Prices a cart. Unavailable lines (unpublished work, sold-out or closed edition) are returned but not
 * counted. A promo code is applied when it is good for the cart; a gift card pays part of the total;
 * a refused code comes back with its reason in `codeErrors` and changes nothing.
 */
export function priceCart(lines: StoredCartLine[], opts: PriceCartOptions & CartCodes = {}): PricedCart {
  const { promoCode, giftCardCode, customerId, email, ...priceOpts } = opts;
  // The VAT rate of a sale now (France, EU under or over the €10,000 threshold, export, franchise).
  const withVat = priceOpts.country && priceOpts.vatRate === undefined ? { ...priceOpts, vatRate: vatRateAt(priceOpts.country, simNow().getTime()) } : priceOpts;
  let cart = priceLines(lines, withVat, liveStock);
  const codeErrors: NonNullable<PricedCart["codeErrors"]> = {};
  if (promoCode?.trim()) {
    const check = checkPromo(promoCode, cart, { customerId, email });
    if ("rule" in check) cart = priceLines(lines, { ...withVat, promo: check.rule }, liveStock);
    else codeErrors.promo = check.reason;
  }
  if (giftCardCode?.trim()) {
    const card = checkGiftCard(giftCardCode, cart);
    if ("reason" in card) codeErrors.giftCard = card.reason;
    else cart = { ...cart, totals: { ...cart.totals, giftCard: { code: card.code, cents: card.cents, balanceAfterCents: card.balanceAfterCents }, dueCents: cart.totals.totalCents - card.cents }, giftCardId: card.id };
  }
  return codeErrors.promo || codeErrors.giftCard ? { ...cart, codeErrors } : cart;
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
