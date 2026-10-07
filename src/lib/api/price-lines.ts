/**
 * The pure core of cart pricing (`priceCart` in ./cart.ts adds the live stock): prices from
 * `pricing.ts` and the catalog, the bundle discount, the totals. The simulation prices its orders here
 * too, so a generated order costs exactly what checkout would charge (docs/admin-v2/01 §4).
 * It reads only static tables: no browser rows, no simulated rows.
 */
import { asset } from "@/lib/asset";
import { BUNDLE_DISCOUNT_PCT, LEVELS, SHIPPING, bundleDiscountCents, formatLabel, guidePriceCents, printCm, isSimplified, resolveLevel, type ShippingMethod } from "@/lib/pricing";
import { printEditions } from "@/data/editions";
import { includedVatCents } from "@/data/tax";
import { palettes, workFormats, works } from "@/data/works";
import type { WorkRow } from "@/data/types";
import { guidePriceCents as basePriceCents, type WorkPricing } from "@/lib/pricing";
import type { CartTotals, PricedCart, PricedCartLine, StoredCartLine } from "./types";

/** Gift card amounts (GiftCard board): $15 / $30 / $50 / $100 / $150. Min/max guard stored lines. */
export const GIFT_CARD_PRESETS = [1500, 3000, 5000, 10000, 15000] as const;
export const GIFT_CARD_MIN = 1000;
export const GIFT_CARD_MAX = 50000;

/** Stock of an edition when the cart is priced: copies taken, copies reserved, open for sale. */
export interface EditionStock {
  sold: number;
  reserved: number;
  open: boolean;
  /** The edition's size now (an edition can be enlarged in the admin). */
  editionSize?: number;
  /** Numbers the next buyers get, lowest free first (a restocked number comes back first). */
  numbers?: number[];
  /** Sold out (as opposed to closed by hand). */
  soldOut?: boolean;
}
/** How a caller reads stock; `null` = every edition open with every copy left (pricing only). */
export type StockReader = ((edition: { id: string; soldCount: number; reservedCount: number; open: boolean }) => EditionStock) | null;

const UNLIMITED: EditionStock = { sold: 0, reserved: 0, open: true };

/** What the price of a work's guide depends on: its Signature flag and its own format prices. */
export function workPricing(row: Pick<WorkRow, "id" | "signature">): WorkPricing {
  return {
    signature: row.signature,
    formatCents: Object.fromEntries(workFormats.filter((f) => f.workId === row.id).map((f) => [f.format, f.guidePriceCents])),
  };
}

/** Cheapest guide of a work: its cheapest active format ("from $15"; a Signature work from $21). */
export function minGuidePriceCents(workId: string): number {
  const row = works.find((w) => w.id === workId)!;
  const pricing = workPricing(row);
  return Math.min(...workFormats.filter((f) => f.workId === workId && f.active).map((f) => basePriceCents(f.format, pricing)));
}


/** "12", "12–13", "4, 12": the numbers of a line, a range when they follow each other. */
function numbersLabel(n: number[]): string {
  if (n.length === 1) return `${n[0]}`;
  return n.every((x, i) => i === 0 || x === n[i - 1]! + 1) ? `${n[0]}–${n.at(-1)}` : n.join(", ");
}

function priceLine(line: StoredCartLine, stockOf: StockReader): PricedCartLine & { workId: string | null } {
  const base = { id: line.id, quantity: 1, unavailable: null, bundleNote: null, workId: null } as const;

  if (line.kind === "gift_card") {
    const valid = Number.isInteger(line.amountCents) && line.amountCents >= GIFT_CARD_MIN && line.amountCents <= GIFT_CARD_MAX;
    return {
      ...base,
      kind: "gift_card",
      title: "Gift card",
      detail: line.recipientName ? `For ${line.recipientName} · sent by email` : "Sent by email",
      shortDetail: line.recipientName ? `For ${line.recipientName}` : "Sent by email",
      receiptTitle: `Gift card${line.recipientName ? ` for ${line.recipientName}` : ""}`,
      note: null,
      imageUrl: undefined,
      href: "/gift-cards",
      unitPriceCents: valid ? line.amountCents : 0,
      maxQuantity: 1,
      unavailable: valid ? null : "invalid",
    };
  }

  if (line.kind === "print") {
    const edition = printEditions.find((e) => e.id === line.editionId);
    const work = edition && works.find((w) => w.id === edition.workId && w.status === "live");
    if (!edition || !work) {
      return { ...base, kind: "print", title: "Print", detail: "", shortDetail: "", receiptTitle: "Print", note: null, href: null, unitPriceCents: 0, maxQuantity: 0, unavailable: "unknown" };
    }
    const stock = stockOf ? stockOf(edition) : UNLIMITED;
    const size = stock.editionSize ?? edition.editionSize;
    const free = stock.numbers ?? Array.from({ length: Math.max(0, size - stock.sold - stock.reserved) }, (_, i) => stock.sold + stock.reserved + 1 + i);
    const left = Math.max(0, Math.min(size - stock.sold - stock.reserved, free.length));
    const quantity = Math.max(1, Math.min(line.quantity, left));
    const mine = free.slice(0, quantity);
    const first = mine[0] ?? stock.sold + stock.reserved + 1;
    const range = numbersLabel(mine.length ? mine : [first]);
    const closed = !stock.open && left > 0;
    const numbers = left === 0 ? "Sold out" : closed ? "No longer available" : `${quantity > 1 ? "Editions" : "Edition"} ${range}/${size}`;
    return {
      ...base,
      workId: work.id,
      kind: "print",
      title: `${work.number} — Print`,
      detail: `${edition.size} · ${printCm(edition.size, work.orientation)} · ${numbers}`,
      // Checkout board: "S · Edition 12/100" in the summary, "N°07 — Print S, 12/100" on the receipt.
      shortDetail: `${edition.size} · ${numbers}`,
      receiptTitle: `${work.number} — Print ${edition.size}${left === 0 || closed ? "" : `, ${range}/${size}`}`,
      edition: { id: edition.id, size: edition.size, editionSize: size, firstNumber: first, left, numbers: free },
      note: "Signed, with certificate",
      imageUrl: asset(work.previewPath),
      orientation: work.orientation,
      href: `/prints/${work.slug}?size=${edition.size.toLowerCase()}`,
      unitPriceCents: edition.priceCents,
      quantity,
      maxQuantity: left,
      // Closed in the admin: "No longer available"; no copy left: sold out. Neither is counted.
      unavailable: left === 0 ? "sold_out" : closed ? "closed" : null,
    };
  }

  const work = works.find((w) => w.id === line.workId && w.status === "live");
  const format = work && workFormats.find((f) => f.workId === work.id && f.format === line.format && f.active);
  const palette = work && palettes.find((p) => p.workId === work.id && p.key === line.palette && p.active);
  if (!work || !format || !palette) {
    const title = work ? `${work.number} — Guide` : "Guide";
    return { ...base, kind: "guide", title, detail: "", shortDetail: "", receiptTitle: title, note: null, href: null, unitPriceCents: 0, maxQuantity: 1, unavailable: "unknown" };
  }
  const level = resolveLevel(line, work.baseLevel);
  const query = new URLSearchParams({ format: line.format, level: line.level, palette: line.palette });
  const size = formatLabel(line.format, work.orientation);
  return {
    ...base,
    workId: work.id,
    kind: "guide",
    title: `${work.number} — Guide`,
    detail: `${size} · ${LEVELS[level].label} · ${palette.name}`,
    // Checkout board: "60×80 · Intermediate" in the summary, "N°03 — Guide, 60×80" on the receipt.
    shortDetail: `${size} · ${LEVELS[level].label}`,
    receiptTitle: `${work.number} — Guide, ${size}`,
    simplified: isSimplified(level, work.baseLevel),
    note: "+ shopping list",
    imageUrl: asset(work.previewPath),
    orientation: work.orientation,
    href: `/works/${work.slug}?${query}`,
    unitPriceCents: guidePriceCents(line.format, workPricing(work)),
    maxQuantity: 1,
  };
}

/**
 * Guide and print of the same work: −15 % on both lines (every guide line and every copy of that
 * work's prints), shown on each line and as one "Guide + print" row in the totals.
 */
function applyBundles(lines: Array<PricedCartLine & { workId: string | null }>): PricedCartLine[] {
  const payable = lines.filter((l) => l.unavailable === null);
  const bundled = new Set(payable.filter((l) => l.kind === "guide" && payable.some((p) => p.kind === "print" && p.workId === l.workId)).map((l) => l.workId));
  return lines.map(({ workId, ...l }) => {
    if (l.unavailable !== null || !workId || !bundled.has(workId) || l.kind === "gift_card") return l;
    return {
      ...l,
      discountCents: bundleDiscountCents(l.unitPriceCents * l.quantity),
      bundleNote: `−${BUNDLE_DISCOUNT_PCT}% with the ${l.kind === "guide" ? "print" : "guide"}`,
    };
  });
}

/** A promo code's rule as priced (`promo_codes`): the checks of dates, uses and first order are in ./cart.ts. */
export interface PromoRule {
  code: string;
  kind: "percent" | "amount";
  /** Percent, or cents for an amount. */
  value: number;
  scope: "guides" | "prints" | "everything";
  label: string;
}

/** The lines a promo can discount: never a gift card; guides, prints or both by its scope. */
export const promoEligible = (l: PricedCartLine, scope: PromoRule["scope"]) =>
  l.unavailable === null && l.kind !== "gift_card" && (scope === "everything" || (scope === "guides" ? l.kind === "guide" : l.kind === "print"));

/**
 * A promo on priced lines, on each line's price after the guide + print bundle. Percent: per line,
 * rounded. Amount: shared in proportion, never more than the lines. Returns the lines with `promoCents`.
 */
export function applyPromo(lines: PricedCartLine[], rule: PromoRule): PricedCartLine[] {
  const net = (l: PricedCartLine) => l.unitPriceCents * l.quantity - (l.discountCents ?? 0);
  const eligible = lines.filter((l) => promoEligible(l, rule.scope));
  const base = eligible.reduce((s, l) => s + net(l), 0);
  if (!base) return lines;
  const shares = new Map<string, number>();
  if (rule.kind === "percent") for (const l of eligible) shares.set(l.id, Math.round((net(l) * rule.value) / 100));
  else {
    const total = Math.min(rule.value, base);
    let given = 0;
    eligible.forEach((l, i) => {
      const c = i === eligible.length - 1 ? total - given : Math.round((total * net(l)) / base);
      shares.set(l.id, c);
      given += c;
    });
  }
  return lines.map((l) => (shares.get(l.id) ? { ...l, promoCents: shares.get(l.id) } : l));
}

export interface PriceCartOptions {
  /** null until the buyer picks a carrier (checkout step 02) → "Calculated at next step". */
  shippingMethod?: ShippingMethod | null;
  /** Country of the address, for the VAT line. Omitted → no VAT line. */
  country?: string;
  /** VAT rate of the sale (src/lib/api/vat.ts `vatRateAt`); omitted: France for France and the EU, 0 elsewhere. */
  vatRate?: number;
  /** A promo already checked (./cart.ts `checkPromo`). */
  promo?: PromoRule;
}

/** Prices lines with a stock reader. Unavailable lines (unpublished work, sold-out edition) are returned but not counted. */
export function priceLines(lines: StoredCartLine[], opts: PriceCartOptions, stockOf: StockReader): PricedCart {
  const bundled = applyBundles(lines.map((l) => priceLine(l, stockOf)));
  const priced = opts.promo ? applyPromo(bundled, opts.promo) : bundled;
  const payable = priced.filter((l) => l.unavailable === null);
  const subtotalCents = payable.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const discountCents = payable.reduce((s, l) => s + (l.discountCents ?? 0), 0);
  const promoCents = payable.reduce((s, l) => s + (l.promoCents ?? 0), 0);
  const hasPhysical = payable.some((l) => l.kind === "print");
  const shippingCents = !hasPhysical ? 0 : opts.shippingMethod ? SHIPPING[opts.shippingMethod].cents : null;
  const totalCents = subtotalCents - discountCents - promoCents + (shippingCents ?? 0);
  const totals: CartTotals = {
    subtotalCents,
    ...(discountCents ? { discountCents, discountLabel: `Guide + print −${BUNDLE_DISCOUNT_PCT}%` } : {}),
    ...(opts.promo && promoCents ? { promo: { code: opts.promo.code, label: `${opts.promo.code} · ${opts.promo.label}`, cents: promoCents } } : {}),
    shippingCents,
    totalCents,
    taxIncludedCents: opts.country ? includedVatCents(totalCents, opts.country, opts.vatRate) : undefined,
  };

  // "Paint N°07 yourself instead? Guide from $15. See it": first print whose work has no guide in the cart.
  const guideWorks = new Set(lines.flatMap((l) => (l.kind === "guide" ? [l.workId] : [])));
  const printLine = lines.find((l): l is Extract<StoredCartLine, { kind: "print" }> => {
    if (l.kind !== "print") return false;
    const e = printEditions.find((x) => x.id === l.editionId);
    return !!e && !guideWorks.has(e.workId);
  });
  const crossWork = printLine && works.find((w) => w.id === printEditions.find((e) => e.id === printLine.editionId)!.workId && w.status === "live");

  return {
    lines: priced,
    count: payable.reduce((n, l) => n + l.quantity, 0),
    hasPhysical,
    hasGuide: payable.some((l) => l.kind === "guide"),
    totals,
    crossSell: crossWork ? { workNumber: crossWork.number, href: `/works/${crossWork.slug}`, fromPriceCents: minGuidePriceCents(crossWork.id) } : null,
  };
}
