/**
 * Cart pricing. The cart only stores what was chosen (work, format, level, palette, edition, gift
 * amount), never a price: every total is recomputed here from `pricing.ts` and the catalog.
 * On Supabase this is the body of `createPaymentIntent` (server); in the mock it runs in the browser
 * for display. Isomorphic and synchronous so the drawer can price on every change.
 */
import { asset } from "@/lib/asset";
import { FORMATS, LEVELS, SHIPPING, guidePriceCents, resolveLevel, type ShippingMethod } from "@/lib/pricing";
import { printEditions } from "@/data/editions";
import { includedVatCents } from "@/data/tax";
import { palettes, workFormats, works } from "@/data/works";
import { minGuidePriceCents } from "./works";
import type { CartLineInput, CartTotals, PricedCart, PricedCartLine, StoredCartLine } from "./types";

/** Gift card amounts (GiftCard board): $30 / $50 / $100 or custom between $10 and $500. */
export const GIFT_CARD_PRESETS = [3000, 5000, 10000] as const;
export const GIFT_CARD_MIN = 1000;
export const GIFT_CARD_MAX = 50000;

/** Number the next buyer of an edition gets ("Edition 12/50"). */
function nextEditionNumber(sold: number, reserved: number) {
  return sold + reserved + 1;
}

function priceLine(line: StoredCartLine): PricedCartLine {
  const base = { id: line.id, quantity: 1, unavailable: null } as const;

  if (line.kind === "gift_card") {
    const valid = Number.isInteger(line.amountCents) && line.amountCents >= GIFT_CARD_MIN && line.amountCents <= GIFT_CARD_MAX;
    return {
      ...base,
      kind: "gift_card",
      title: "Gift card",
      detail: line.recipientName ? `For ${line.recipientName} · sent by email` : "Sent by email",
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
      return { ...base, kind: "print", title: "Print", detail: "", note: null, href: null, unitPriceCents: 0, maxQuantity: 0, unavailable: "unknown" };
    }
    const left = Math.max(0, edition.editionSize - edition.soldCount - edition.reservedCount);
    const quantity = Math.max(1, Math.min(line.quantity, left));
    const first = nextEditionNumber(edition.soldCount, edition.reservedCount);
    const numbers = left === 0 ? "Sold out" : quantity > 1 ? `Editions ${first}–${first + quantity - 1}/${edition.editionSize}` : `Edition ${first}/${edition.editionSize}`;
    return {
      ...base,
      kind: "print",
      title: `${work.number} — Print`,
      detail: `${edition.size} · Cotton paper · ${numbers}`,
      note: "Signed, with certificate",
      imageUrl: asset(work.previewPath),
      href: `/prints/${work.slug}`,
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
    return { ...base, kind: "guide", title: work ? `${work.number} — Guide` : "Guide", detail: "", note: null, href: null, unitPriceCents: 0, maxQuantity: 1, unavailable: "unknown" };
  }
  const config = { format: line.format, level: line.level, palette: line.palette };
  const level = resolveLevel(config);
  const query = new URLSearchParams({ format: line.format, level: line.level, palette: line.palette });
  return {
    ...base,
    kind: "guide",
    title: `${work.number} — Guide`,
    detail: `${FORMATS[line.format].label} · ${LEVELS[level].label} · ${palette.name}`,
    note: "+ shopping list",
    imageUrl: asset(work.previewPath),
    href: `/works/${work.slug}?${query}`,
    unitPriceCents: guidePriceCents(config),
    maxQuantity: 1,
  };
}

export interface PriceCartOptions {
  /** null until the buyer picks a carrier (checkout step 02) → "Calculated at next step". */
  shippingMethod?: ShippingMethod | null;
  /** Country of the address, for the VAT line. Omitted → no VAT line. */
  country?: string;
}

/** Prices a cart. Unavailable lines (unpublished work, sold-out edition) are returned but not counted. */
export function priceCart(lines: StoredCartLine[], opts: PriceCartOptions = {}): PricedCart {
  const priced = lines.map(priceLine);
  const payable = priced.filter((l) => l.unavailable === null);
  const subtotalCents = payable.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const hasPhysical = payable.some((l) => l.kind === "print");
  const shippingCents = !hasPhysical ? 0 : opts.shippingMethod ? SHIPPING[opts.shippingMethod].cents : null;
  const totalCents = subtotalCents + (shippingCents ?? 0);
  const totals: CartTotals = {
    subtotalCents,
    shippingCents,
    totalCents,
    taxIncludedCents: opts.country ? includedVatCents(totalCents, opts.country) : undefined,
  };

  // "Paint N°07 yourself instead? Guide from $12. See it": first print whose work has no guide in the cart.
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
    return a.workId === b.workId && a.format === b.format && resolveLevel(a) === resolveLevel(b) && a.palette === b.palette;
  }
  if (a.kind === "print" && b.kind === "print") return a.editionId === b.editionId;
  return false; // gift cards are always separate lines
}
