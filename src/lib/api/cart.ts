/**
 * Cart pricing. The cart only stores what was chosen (work, format, level, palette, edition, gift
 * amount), never a price: every total is recomputed here from `pricing.ts` and the catalog.
 * On Supabase this is the body of `createPaymentIntent` (server); in the mock it runs in the browser
 * for display. Isomorphic and synchronous so the drawer can price on every change.
 */
import { asset } from "@/lib/asset";
import { BUNDLE_DISCOUNT_PCT, LEVELS, SHIPPING, bundleDiscountCents, formatLabel, guidePriceCents, printCm, isSimplified, resolveLevel, type ShippingMethod } from "@/lib/pricing";
import { printEditions } from "@/data/editions";
import { includedVatCents } from "@/data/tax";
import { palettes, workFormats, works } from "@/data/works";
import { localSoldCount } from "./local";
import { minGuidePriceCents, workPricing } from "./works";
import type { CartLineInput, CartTotals, PricedCart, PricedCartLine, StoredCartLine } from "./types";

/** Gift card amounts (GiftCard board): $15 / $30 / $50 / $100 / $150. Min/max guard stored lines. */
export const GIFT_CARD_PRESETS = [1500, 3000, 5000, 10000, 15000] as const;
export const GIFT_CARD_MIN = 1000;
export const GIFT_CARD_MAX = 50000;

/** Copies sold so far: the mock count plus the copies bought in this browser. */
function soldCount(edition: { id: string; soldCount: number }) {
  return edition.soldCount + localSoldCount(edition.id);
}

/** Number the next buyer of an edition gets ("Edition 12/100"). */
function nextEditionNumber(sold: number, reserved: number) {
  return sold + reserved + 1;
}

function priceLine(line: StoredCartLine): PricedCartLine & { workId: string | null } {
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
    const sold = soldCount(edition);
    const left = Math.max(0, edition.editionSize - sold - edition.reservedCount);
    const quantity = Math.max(1, Math.min(line.quantity, left));
    const first = nextEditionNumber(sold, edition.reservedCount);
    const range = quantity > 1 ? `${first}–${first + quantity - 1}` : `${first}`;
    const numbers = left === 0 ? "Sold out" : `${quantity > 1 ? "Editions" : "Edition"} ${range}/${edition.editionSize}`;
    return {
      ...base,
      workId: work.id,
      kind: "print",
      title: `${work.number} — Print`,
      detail: `${edition.size} · ${printCm(edition.size, work.orientation)} · ${numbers}`,
      // Checkout board: "S · Edition 12/100" in the summary, "N°07 — Print S, 12/100" on the receipt.
      shortDetail: `${edition.size} · ${numbers}`,
      receiptTitle: `${work.number} — Print ${edition.size}${left === 0 ? "" : `, ${range}/${edition.editionSize}`}`,
      edition: { id: edition.id, size: edition.size, editionSize: edition.editionSize, firstNumber: first, left },
      note: "Signed, with certificate",
      imageUrl: asset(work.previewPath),
      orientation: work.orientation,
      href: `/prints/${work.slug}?size=${edition.size.toLowerCase()}`,
      unitPriceCents: edition.priceCents,
      quantity,
      maxQuantity: left,
      unavailable: !edition.open || left === 0 ? "sold_out" : null,
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

export interface PriceCartOptions {
  /** null until the buyer picks a carrier (checkout step 02) → "Calculated at next step". */
  shippingMethod?: ShippingMethod | null;
  /** Country of the address, for the VAT line. Omitted → no VAT line. */
  country?: string;
}

/** Prices a cart. Unavailable lines (unpublished work, sold-out edition) are returned but not counted. */
export function priceCart(lines: StoredCartLine[], opts: PriceCartOptions = {}): PricedCart {
  const priced = applyBundles(lines.map(priceLine));
  const payable = priced.filter((l) => l.unavailable === null);
  const subtotalCents = payable.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const discountCents = payable.reduce((s, l) => s + (l.discountCents ?? 0), 0);
  const hasPhysical = payable.some((l) => l.kind === "print");
  const shippingCents = !hasPhysical ? 0 : opts.shippingMethod ? SHIPPING[opts.shippingMethod].cents : null;
  const totalCents = subtotalCents - discountCents + (shippingCents ?? 0);
  const totals: CartTotals = {
    subtotalCents,
    ...(discountCents ? { discountCents, discountLabel: `Guide + print −${BUNDLE_DISCOUNT_PCT}%` } : {}),
    shippingCents,
    totalCents,
    taxIncludedCents: opts.country ? includedVatCents(totalCents, opts.country) : undefined,
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

/** Two inputs that are the same purchase: a guide config already in the cart, or the same edition. */
export function sameCartLine(a: CartLineInput, b: CartLineInput): boolean {
  if (a.kind === "guide" && b.kind === "guide") {
    const base = works.find((w) => w.id === a.workId)?.baseLevel ?? "intermediate";
    return a.workId === b.workId && a.format === b.format && resolveLevel(a, base) === resolveLevel(b, base) && a.palette === b.palette;
  }
  if (a.kind === "print" && b.kind === "print") return a.editionId === b.editionId;
  return false; // gift cards are always separate lines
}
