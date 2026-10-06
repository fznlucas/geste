/**
 * Ledger lines from the rows (docs/admin-v2/02): pure functions, one per kind of money event. Orders
 * are charged in USD; the books are EUR excluding VAT at the day's rate (./fx.ts). Cash basis: an
 * order counts on its payment day, a refund on its own day, a gift card when it is used, an affiliate
 * commission when the partner pays.
 */
import { BUSINESS, type UrssafCategory, type VatRegime } from "@/config/business";
import { addDays, parisDay } from "@/lib/clock";
import type { GiftCardRow } from "@/data/marketing";
import { FR_VAT_RATE, VAT_RATES } from "@/data/tax";
import type { AffiliateCommissionRow, AiJobRow, OrderRow, PaymentRow, PrintCopyRow, RefundRow, ShipmentRow } from "@/data/types";
import { fxRate, toEur } from "./fx";
import type { LedgerAccount, LedgerLine } from "./types";

const B = BUSINESS;
const EU = new Set(["FR", "BE", "DE", "NL", "ES", "IT", "AT", "PT", "IE", "LU"]);
const zoneOf = (country: string): "FR" | "EU" | "INTL" => (country === "FR" ? "FR" : EU.has(country) ? "EU" : "INTL");

/**
 * VAT rate of a sale when the caller does not give one: France 20 %, the rest of the EU 20 % (under the
 * €10,000 threshold), outside the EU 0; none under the franchise. The books pass `vatRateAt` (src/lib/api/vat.ts).
 */
export function vatRateOf(country: string, regime: VatRegime): number {
  return regime === "franchise" ? 0 : Object.hasOwn(VAT_RATES, country) ? FR_VAT_RATE : 0;
}

/** How an order was paid, for its fees (fixture and browser orders have no payment row: a standard card). */
export interface PaymentInfo {
  method: PaymentRow["method"];
  cardRegion: PaymentRow["cardRegion"];
  premiumCard: boolean;
}

export function paymentInfo(payment: PaymentRow | undefined, country: string): PaymentInfo {
  if (payment) return { method: payment.method, cardRegion: payment.cardRegion, premiumCard: payment.premiumCard };
  return { method: "card", cardRegion: country === "GB" ? "uk" : EU.has(country) ? "eea" : "intl", premiumCard: false };
}

/** Stripe / PayPal fee, conversion fee and Stripe Tax on an amount charged (EUR cents). */
export function paymentFees(p: PaymentInfo, chargedEur: number, regime: VatRegime): { fee: number; fx: number; tax: number } {
  if (chargedEur <= 0) return { fee: 0, fx: 0, tax: 0 };
  const f = B.fees;
  const grid = p.method === "paypal" ? f.paypal.value : p.cardRegion === "uk" ? f.stripeUk.value : p.cardRegion === "intl" ? f.stripeIntl.value : p.premiumCard ? f.stripeEeaPremium.value : f.stripeEea.value;
  return {
    fee: Math.round((chargedEur * grid.pct) / 100) + grid.fixedCents,
    fx: Math.round((chargedEur * f.currencyConversionPct.value) / 100),
    tax: regime === "collect" ? Math.round((chargedEur * f.stripeTaxPct.value) / 100) : 0,
  };
}

const line = (l: Omit<LedgerLine, "id">, n: number): LedgerLine => ({ ...l, id: `${l.sourceTable}:${l.sourceId}:${n}` });

/** Categories and revenue accounts of an order's item kinds. */
const REVENUE: Record<"guide" | "print" | "shipping", { account: LedgerAccount; refund: LedgerAccount; category: UrssafCategory }> = {
  guide: { account: "revenue.guides", refund: "refunds.guides", category: B.categories.guides.value },
  print: { account: "revenue.prints", refund: "refunds.prints", category: B.categories.prints.value },
  shipping: { account: "revenue.shipping", refund: "refunds.shipping", category: B.categories.shipping.value },
};

/** An order's sale lines in EUR excl. VAT: what it sold, the VAT collected, a gift card sold as a liability. */
function saleParts(order: OrderRow, country: string, vat: number, rate: number) {
  const parts: Array<{ kind: "guide" | "print" | "shipping"; exVat: number; vat: number; usd: number }> = [];
  let giftCardSold = 0, giftCardSoldUsd = 0;
  const add = (kind: "guide" | "print" | "shipping", usd: number) => {
    if (usd <= 0) return;
    const eur = toEur(usd, rate);
    const exVat = Math.round(eur / (1 + vat));
    parts.push({ kind, exVat, vat: eur - exVat, usd });
  };
  for (const i of order.items) {
    const usd = i.unitPriceCents * i.quantity - (i.discountCents ?? 0);
    if (i.kind === "gift_card") {
      giftCardSold += toEur(usd, rate);
      giftCardSoldUsd += usd;
    } else add(i.kind, usd);
  }
  add("shipping", order.shippingCents);
  return { parts, giftCardSold, giftCardSoldUsd };
}

export function ledgerFromOrder(order: OrderRow, payment: PaymentRow | undefined, country: string, regime: VatRegime, vatRate: number = vatRateOf(country, regime)): LedgerLine[] {
  const day = parisDay(order.paidAt);
  const rate = fxRate(day);
  const out: LedgerLine[] = [];
  let n = 0;
  const base = { at: order.paidAt, sourceTable: "orders", sourceId: order.id, fxRate: rate };
  const { parts, giftCardSold, giftCardSoldUsd } = saleParts(order, country, vatRate, rate);
  // The share paid with a gift card is turnover of the card's use, not of this sale (02 §3).
  const giftUsd = (order.giftCardRedemptions ?? []).reduce((s, r) => s + r.cents, 0);
  const giftShare = order.totalCents > 0 ? Math.min(1, giftUsd / order.totalCents) : 0;
  for (const p of parts) {
    const R = REVENUE[p.kind];
    const fromGift = Math.round(p.exVat * giftShare);
    if (p.exVat - fromGift) out.push(line({ ...base, account: R.account, amountEurCents: p.exVat - fromGift, amountUsdCents: p.usd, category: R.category, memo: `${p.kind === "shipping" ? "Shipping charged" : p.kind === "guide" ? "Guide" : "Print"} excl. VAT` }, n++));
    if (fromGift) out.push(line({ ...base, account: "revenue.giftcards_redeemed", amountEurCents: fromGift, category: R.category, memo: `Gift card used · ${p.kind}` }, n++));
    if (p.vat) out.push(line({ ...base, account: "liability.vat", amountEurCents: p.vat, category: "none", country, vatRatePct: Math.round(vatRate * 1000) / 10, memo: `VAT ${country} ${Math.round(vatRate * 1000) / 10}%` }, n++));
  }
  if (giftCardSold) out.push(line({ ...base, account: "liability.giftcards", amountEurCents: giftCardSold, amountUsdCents: giftCardSoldUsd, category: "none", memo: "Gift card sold (owed until used)" }, n++));
  const chargedUsd = order.totalCents - giftUsd;
  const chargedEur = toEur(chargedUsd, rate);
  const fees = paymentFees(paymentInfo(payment, country), chargedEur, regime);
  if (fees.fee) out.push(line({ ...base, account: "cost.payment_fees", amountEurCents: -fees.fee, category: "none", memo: payment?.method === "paypal" ? "PayPal fee" : "Stripe fee" }, n++));
  if (fees.tax) out.push(line({ ...base, account: "cost.payment_fees", amountEurCents: -fees.tax, category: "none", memo: "Stripe Tax" }, n++));
  if (fees.fx) out.push(line({ ...base, account: "cost.fx", amountEurCents: -fees.fx, category: "none", memo: "Currency conversion USD → EUR" }, n++));
  if (chargedEur) {
    out.push(line({
      ...base, account: "cash.stripe_balance", amountEurCents: chargedEur - fees.fee - fees.tax - fees.fx, amountUsdCents: chargedUsd, category: "none",
      availableAt: addDaysIso(order.paidAt, B.payouts.value.availableAfterDays), memo: "Payment, net of fees",
    }, n++));
  }
  return out;
}

const addDaysIso = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 19) + "Z";

/**
 * A gift card used to pay: what it still owed comes off the liability, at the card's own rate, as the
 * difference of the balances before and after (rounded), so the uses never add up to more than the sale.
 */
export function ledgerFromGiftCardUse(card: GiftCardRow, orderId: string, cents: number, at: string, balanceBeforeCents: number): LedgerLine[] {
  const rate = fxRate(parisDay(card.createdAt));
  const eur = toEur(balanceBeforeCents, rate) - toEur(balanceBeforeCents - cents, rate);
  return [line({ at, account: "liability.giftcards", amountEurCents: -eur, amountUsdCents: cents, fxRate: rate, category: "none", sourceTable: "gift_card_redemptions", sourceId: `${card.id}:${orderId}`, memo: `Gift card ${card.code} used` }, 0)];
}

/** A gift card past its validity with money left: breakage, turnover on its expiry day. */
export function ledgerFromBreakage(card: GiftCardRow, now: number): LedgerLine[] {
  const expiry = new Date(Date.parse(card.createdAt));
  expiry.setUTCFullYear(expiry.getUTCFullYear() + B.giftCardExpiryYears.value);
  if (expiry.getTime() > now || card.balanceCents <= 0) return [];
  const rate = fxRate(parisDay(card.createdAt));
  const eur = toEur(card.balanceCents, rate);
  const at = expiry.toISOString().slice(0, 19) + "Z";
  const base = { at, sourceTable: "gift_cards", sourceId: card.id, fxRate: rate, amountUsdCents: card.balanceCents };
  return [
    line({ ...base, account: "revenue.giftcards_breakage", amountEurCents: eur, category: B.categories.breakage.value, memo: `Gift card ${card.code} expired unused` }, 0),
    line({ ...base, account: "liability.giftcards", amountEurCents: -eur, category: "none", memo: `Gift card ${card.code} expired` }, 1),
  ];
}

/** A refund: negative turnover on its day, same categories as the order (shared in proportion), VAT back, out of the Stripe balance. */
export function ledgerFromRefund(refund: RefundRow, order: OrderRow, country: string, regime: VatRegime, vatRate: number = vatRateOf(country, regime)): LedgerLine[] {
  const rate = fxRate(parisDay(refund.createdAt));
  const { parts } = saleParts(order, country, vatRate, rate);
  const total = parts.reduce((s, p) => s + p.exVat + p.vat, 0);
  const refundEur = toEur(refund.amountCents, rate);
  const out: LedgerLine[] = [];
  let n = 0;
  const base = { at: refund.createdAt, sourceTable: "refunds", sourceId: refund.id, fxRate: rate };
  if (total > 0) {
    for (const p of parts) {
      const share = (p.exVat + p.vat) / total;
      const exVat = Math.round((refundEur * share) / (1 + vatRate));
      const vat = Math.round(refundEur * share) - exVat;
      const R = REVENUE[p.kind];
      if (exVat) out.push(line({ ...base, account: R.refund, amountEurCents: -exVat, category: R.category, memo: `Refund · ${refund.reason}` }, n++));
      if (vat) out.push(line({ ...base, account: "liability.vat", amountEurCents: -vat, category: "none", country, vatRatePct: Math.round(vatRate * 1000) / 10, memo: `VAT refunded ${country}` }, n++));
    }
  }
  // What goes back onto gift cards is owed again (./ledgerFromGiftCardRefund); the rest leaves the Stripe balance.
  const toCardsUsd = (refund.giftCards ?? []).reduce((s, g) => s + g.cents, 0);
  const cashUsd = refund.amountCents - toCardsUsd;
  const cashEur = refundEur - toEur(toCardsUsd, rate);
  if (cashUsd) out.push(line({ ...base, account: "cash.stripe_balance", amountEurCents: -cashEur, amountUsdCents: cashUsd, category: "none", availableAt: refund.createdAt, memo: "Refund paid" }, n++));
  return out;
}

/**
 * A refund paid back onto a gift card: the card owes it again, at the card's own rate, as the difference
 * of the balances after and before (rounded), like a use in reverse.
 */
export function ledgerFromGiftCardRefund(card: GiftCardRow, refundId: string, cents: number, at: string, balanceBeforeCents: number): LedgerLine[] {
  const rate = fxRate(parisDay(card.createdAt));
  const eur = toEur(balanceBeforeCents + cents, rate) - toEur(balanceBeforeCents, rate);
  return [line({ at, account: "liability.giftcards", amountEurCents: eur, amountUsdCents: cents, fxRate: rate, category: "none", sourceTable: "gift_card_refunds", sourceId: `${card.id}:${refundId}`, memo: `Refund onto gift card ${card.code}` }, 0)];
}

/** A label bought for a shipment, and its packaging. */
export function ledgerFromShipment(s: ShipmentRow, country: string): LedgerLine[] {
  const at = s.labelCreatedAt ?? s.shippedAt;
  if (!at) return [];
  const grid = B.costs.labels.value as Record<string, Record<"FR" | "EU" | "INTL", number>>;
  const label = (grid[s.carrier] ?? grid.colissimo!)[zoneOf(country)];
  const base = { at, sourceTable: "shipments", sourceId: s.id, category: "none" as const };
  return [
    line({ ...base, account: "cost.shipping_labels", amountEurCents: -label, memo: `${s.carrier} label · ${s.trackingNo}` }, 0),
    line({ ...base, account: "cost.packaging", amountEurCents: -B.costs.packagingCents.value, memo: "Tube, caps, certificate card" }, 1),
  ];
}

/** Paper and ink of a printed copy (copies sold before launch were printed before the books start). */
export function ledgerFromCopy(c: PrintCopyRow, size: "S" | "M" | "L"): LedgerLine[] {
  if (!c.printedAt || c.soldBeforeLaunch) return [];
  return [line({ at: c.printedAt, account: "cost.print_production", amountEurCents: -B.costs.printProduction.value[size], category: "none", sourceTable: "print_copies", sourceId: c.id, memo: `Print ${size} · paper and ink` }, 0)];
}

/** A partner's commission, when the partner pays it (into the bank). */
export function ledgerFromAffiliate(c: AffiliateCommissionRow, now: number): LedgerLine[] {
  if (Date.parse(c.paidAt) > now) return [];
  const base = { at: c.paidAt, sourceTable: "affiliate_commissions", sourceId: c.id };
  return [
    line({ ...base, account: "revenue.affiliate", amountEurCents: c.commissionCents, category: B.categories.affiliate.value, memo: `Commission ${c.partnerId}` }, 0),
    line({ ...base, account: "cash.bank", amountEurCents: c.commissionCents, category: "none", memo: `Commission paid by ${c.partnerId}` }, 1),
  ];
}

/** A GPU job, on its run date (the worker bills in USD). */
export function ledgerFromAiJob(j: AiJobRow): LedgerLine[] {
  const rate = fxRate(parisDay(j.createdAt));
  const eur = toEur(j.costCents, rate);
  const base = { at: j.createdAt, sourceTable: "ai_jobs", sourceId: j.id, category: "none" as const, fxRate: rate, amountUsdCents: j.costCents };
  return [
    line({ ...base, account: "cost.gpu", amountEurCents: -eur, memo: `GPU · job ${j.number}` }, 0),
    line({ ...base, account: "cash.bank", amountEurCents: -eur, memo: `GPU · job ${j.number}` }, 1),
  ];
}

/** Monthly costs from launch to now: software, studio materials, bank fee (out of the bank). */
export function ledgerFromSubscriptions(from: string, now: number): LedgerLine[] {
  const out: LedgerLine[] = [];
  const today = parisDay(now);
  const cost = (account: LedgerAccount, vendor: string, cents: number, day: string) => {
    if (cents <= 0 || day > today || day < from) return;
    const at = `${day}T08:00:00Z`;
    const base = { at, sourceTable: "expenses", sourceId: `${vendor}:${day}`, category: "none" as const };
    out.push(line({ ...base, account, amountEurCents: -cents, memo: vendor }, 0), line({ ...base, account: "cash.bank", amountEurCents: -cents, memo: vendor }, 1));
  };
  for (let month = from.slice(0, 7); `${month}-01` <= today; month = addDays(`${month}-28`, 4).slice(0, 7)) {
    const d = (n: number) => `${month}-${String(n).padStart(2, "0")}`;
    for (const s of B.costs.software.value) cost("cost.software", s.vendor, s.cents, d(s.day));
    cost("cost.studio_materials", "Studio materials (monthly restock)", B.costs.studioMaterials.value.monthlyCents, d(B.costs.studioMaterials.value.day));
    cost("cost.bank", "Bank account fee", B.bank.value.monthlyFeeCents, d(B.bank.value.feeDay));
    cost("cost.ads", "Ads", B.costs.adsMonthlyCents.value, d(1));
  }
  return out;
}
