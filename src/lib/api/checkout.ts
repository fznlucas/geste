/**
 * Mock checkout. On Supabase this is `createPaymentIntent` (prices recomputed from the stored cart,
 * never from the client) and the Stripe webhook (order, numbered copies, one entitlement per
 * guide). In the mock the browser calls it after the fake payment and keeps the rows locally.
 */
import { SHIPPING, resolveLevel, type ShippingMethod } from "@/lib/pricing";
import { printEditions } from "@/data/editions";
import { guideId } from "@/data/guides";
import { includedVatCents } from "@/data/tax";
import type { EntitlementRow, OrderItemRow, PrintCopyRow } from "@/data/types";
import { works } from "@/data/works";
import { priceCart } from "./cart";
import { ORDER_NUMBER_START } from "@/sim/config";
import { allEntitlements, allOrders, type LocalRows } from "./local";
import type { Address, StoredCartLine } from "./types";

export interface PlaceOrderInput {
  lines: StoredCartLine[];
  /** The buyer's account (created or found from the email). */
  customerId: string;
  email: string;
  shippingMethod: ShippingMethod | null;
  shippingAddress: Address | null;
  /** Billing / shipping country for the VAT line (ISO code). */
  country: string;
  cardLast4: string;
  withdrawalWaived: boolean;
  /**
   * Sold-out race (Checkout board, "Take 13/50 and pay"): numbers to skip per edition id because
   * someone else took them between the cart and the payment.
   */
  skipNumbers?: Record<string, number>;
  now: string;
}

export class CheckoutError extends Error {
  constructor(
    public code: "empty" | "sold_out",
    message: string,
  ) {
    super(message);
  }
}

/** The number the next order gets: orders are numbered in payment order (GS-1001 on launch day). */
export function nextOrderNumber(): string {
  return `GS-${ORDER_NUMBER_START + allOrders().length}`;
}

/** Builds the rows the webhook would write. Throws `CheckoutError` for an empty cart or a sold-out line. */
export function buildOrder(input: PlaceOrderInput): LocalRows & { number: string } {
  const cart = priceCart(input.lines, { shippingMethod: input.shippingMethod, country: input.country });
  const soldOut = cart.lines.find((l) => l.unavailable === "sold_out");
  if (soldOut) throw new CheckoutError("sold_out", `${soldOut.title} is sold out`);
  const payable = cart.lines.filter((l) => l.unavailable === null);
  if (payable.length === 0) throw new CheckoutError("empty", "Your cart is empty.");

  const number = nextOrderNumber();
  // Ids of this browser's orders follow their own sequence; the number is given at read time.
  const n = String(allOrders().filter((o) => o.id.startsWith("order-local-")).length + 1);
  const orderId = `order-local-${n}`;
  const items: OrderItemRow[] = [];
  const copies: PrintCopyRow[] = [];
  const entitlements: EntitlementRow[] = [];
  const owned = allEntitlements().filter((e) => e.userId === input.customerId && e.revokedAt === null);

  payable.forEach((line, index) => {
    const id = `item-local-${n}-${index + 1}`;
    const stored = input.lines.find((l) => l.id === line.id)!;
    if (stored.kind === "gift_card") {
      items.push({ id, kind: "gift_card", workId: null, guideId: null, editionId: null, config: {}, title: `Gift card $${line.unitPriceCents / 100}`, detail: "Sent by email", unitPriceCents: line.unitPriceCents, quantity: 1, discountCents: 0, fulfilment: "not_required" });
      return;
    }
    if (stored.kind === "print" && line.edition) {
      const edition = printEditions.find((e) => e.id === stored.editionId)!;
      const work = works.find((w) => w.id === edition.workId)!;
      const first = line.edition.firstNumber + (input.skipNumbers?.[line.edition.id] ?? 0);
      if (first + line.quantity - 1 > line.edition.editionSize) throw new CheckoutError("sold_out", `${line.title} is sold out`);
      const numbers = Array.from({ length: line.quantity }, (_, i) => first + i);
      items.push({
        id, kind: "print", workId: work.id, guideId: null, editionId: edition.id, config: {},
        title: `Print ${work.number}`,
        detail: `${line.edition.size} · edition ${numbers.join(", ")}/${line.edition.editionSize}`,
        unitPriceCents: line.unitPriceCents, quantity: line.quantity, discountCents: line.discountCents ?? 0, fulfilment: "to_print",
      });
      const workPart = line.edition.id.split("-")[1];
      for (const num of numbers) {
        copies.push({ id: `copy-local-${n}-${line.edition.id}-${num}`, editionId: line.edition.id, number: num, status: "sold", orderItemId: id, fulfilment: "to_print", certificateNo: `C-${workPart}-${String(num).padStart(3, "0")}`, printedAt: null });
      }
      return;
    }
    if (stored.kind === "guide") {
      const work = works.find((w) => w.id === stored.workId)!;
      const format = stored.format;
      const level = resolveLevel(stored, work.baseLevel);
      const gid = guideId(work.slug, format, level);
      items.push({
        id, kind: "guide", workId: work.id, guideId: gid, editionId: null,
        config: { format, level, palette: stored.palette },
        title: `Guide ${work.number}`, detail: line.detail,
        unitPriceCents: line.unitPriceCents, quantity: 1, discountCents: line.discountCents ?? 0, fulfilment: "not_required",
      });
      // A guide is bought once: a second purchase of the same guide keeps the first entitlement.
      if (!owned.some((e) => e.guideId === gid) && !entitlements.some((e) => e.guideId === gid)) {
        entitlements.push({ id: `local-${gid}`, userId: input.customerId, guideId: gid, orderItemId: id, paletteKey: stored.palette, printsLeft: 3, progress: { step: "1a" }, openedAt: null, revokedAt: null, createdAt: input.now });
      }
    }
  });

  const hasPrint = items.some((i) => i.kind === "print");
  const shippingMethod = hasPrint ? (input.shippingMethod ?? "colissimo") : null;
  const shippingCents = shippingMethod ? SHIPPING[shippingMethod].cents : 0;
  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const discountCents = items.reduce((s, i) => s + i.discountCents, 0);
  const totalCents = subtotalCents - discountCents + shippingCents;
  return {
    number,
    orders: [{
      id: orderId, number, userId: input.customerId, email: input.email, status: "paid",
      subtotalCents, discountCents, shippingCents, shippingMethod,
      taxCents: includedVatCents(totalCents, input.country), totalCents, country: input.country || undefined,
      shippingAddress: hasPrint ? input.shippingAddress : null,
      stripePaymentIntent: `pi_3Px${n}L9aQ`, cardLast4: input.cardLast4, risk: "low",
      withdrawalWaived: input.withdrawalWaived, paidAt: input.now, createdAt: input.now, items,
    }],
    entitlements,
    copies,
  };
}
