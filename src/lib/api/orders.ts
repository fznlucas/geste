/** Orders (admin and account). */
import { asset } from "@/lib/asset";
import { shortDate } from "@/lib/dates";
import { CARRIERS, carrierOf, deliveryName, deliveryRange, deliveryWindow, formatTrackingNo } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { SHIPPING, formatLabel } from "@/lib/pricing";
import type { OrderRow } from "@/data/types";
import { clone } from "./clone";
import { customerTotals } from "./customer-totals";
import { includedVatCents, vatableCents } from "@/data/tax";
import { vatRateAt } from "./vat";
import { allOrders, allPayments, copiesOfItem, customerById, editionById, workById, entitlementOfItem, orderByNumber, refundsOfOrder, shipmentOfOrder, threadsOfOrder } from "./local";
import { inOrderTab } from "@/lib/metrics/orders";
import { mapThread } from "./support";
import type { FulfilmentStatus, Order, OrderDetail, OrderDisplayStatus, OrderEvent, OrderItem, OrdersQuery, OrderTracking, RefundOption, TrackingStep } from "./types";

/** Least advanced print decides the status of an order with prints. */
const PRINT_STATUS: Array<[FulfilmentStatus, OrderDisplayStatus]> = [
  ["to_print", "To ship"],
  ["printed", "Printed"],
  ["packed", "Packed"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["returned", "Delivered"],
];

function displayStatus(row: OrderRow): OrderDisplayStatus {
  if (row.status === "pending") return "Pending";
  if (row.status === "cancelled") return "Cancelled";
  if (row.status === "refunded") return "Refunded";
  if (row.status === "partially_refunded") return "Partly refunded";
  if (threadsOfOrder(row.id).some((t) => t.category === "refund" && t.status === "open")) return "Refund asked";
  const prints = row.items.filter((i) => i.kind === "print").map((i) => itemFulfilment(i.id, i.fulfilment));
  if (prints.length === 0) return "Delivered";
  return PRINT_STATUS.find(([f]) => prints.includes(f))?.[1] ?? "Delivered";
}

/** A print line follows its numbered copies (moved on the fulfilment board); the least advanced wins. */
function itemFulfilment(itemId: string, fallback: FulfilmentStatus): FulfilmentStatus {
  const copies = copiesOfItem(itemId);
  if (!copies.length) return fallback;
  return PRINT_STATUS.find(([f]) => copies.some((c) => c.fulfilment === f))?.[0] ?? fallback;
}


export function mapOrder(row: OrderRow): Order {
  const customer = customerById(row.userId)!;
  const shipment = shipmentOfOrder(row.id);
  const items = row.items.map((i) => {
    const ent = i.kind === "guide" ? entitlementOfItem(i.id) : undefined;
    const work = workById(i.workId);
    const itemCopies = [...copiesOfItem(i.id)].sort((a, b) => a.number - b.number);
    return {
      id: i.id,
      kind: i.kind,
      workId: i.workId,
      workSlug: work?.slug ?? null,
      workNumber: work?.number ?? null,
      guideId: i.guideId,
      editionId: i.editionId,
      config: i.config,
      title: i.title,
      detail: i.detail,
      imageUrl: work ? asset(work.previewPath) : null,
      orientation: work?.orientation ?? "portrait",
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      discountCents: i.discountCents ?? 0,
      fulfilment: i.kind === "print" ? itemFulfilment(i.id, i.fulfilment) : i.fulfilment,
      certificateNo: itemCopies[0]?.certificateNo ?? null,
      copyNumbers: itemCopies.map((c) => c.number),
      edition: (() => {
        const e = editionById(i.editionId);
        return e ? { size: e.size, editionSize: e.editionSize } : null;
      })(),
      printedAt: itemCopies.length && itemCopies.every((c) => c.printedAt) ? itemCopies.map((c) => c.printedAt!).sort().at(-1)! : null,
      copyIds: itemCopies.map((c) => c.id),
      entitlementId: ent?.id ?? null,
      printsLeft: ent ? ent.printsLeft : null,
      accessRevoked: !!ent?.revokedAt,
    };
  });
  const summary = items
    .map((i) => (i.kind === "print" ? `${i.title} ${editionById(i.editionId)?.size ?? ""}` : i.title))
    .join(" · ");
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    giftCardRedemptions: row.giftCardRedemptions ?? [],
    displayStatus: displayStatus(row),
    customer: { id: customer.id, fullName: customer.fullName, email: customer.email },
    summary,
    items,
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    shippingCents: row.shippingCents,
    shippingMethod: row.shippingMethod,
    taxCents: orderVatCents(row),
    totalCents: row.totalCents,
    shippingAddress: row.shippingAddress,
    cardLast4: row.cardLast4,
    paymentIntent: row.stripePaymentIntent,
    risk: row.risk,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    refunds: refundsOfOrder(row.id)
      .map(({ id, amountCents, reason, restock, revokeAccess, createdAt, giftCards }) => ({ id, amountCents, reason, restock, revokeAccess, createdAt, ...(giftCards ? { giftCards } : {}) })),
    shipment: shipment
      ? { id: shipment.id, labelCreatedAt: shipment.labelCreatedAt ?? null, carrier: shipment.carrier, trackingNo: shipment.trackingNo, parcel: shipment.parcel, status: shipment.status, shippedAt: shipment.shippedAt, inTransitAt: shipment.inTransitAt, outForDeliveryAt: shipment.outForDeliveryAt, deliveredAt: shipment.deliveredAt }
      : null,
  };
}

function timeline(order: Order): OrderEvent[] {
  const events: OrderEvent[] = [{ at: order.paidAt, label: `Order paid · ${formatPrice(order.totalCents)} · Card ···${order.cardLast4}` }];
  const guides = order.items.filter((i) => i.kind === "guide");
  if (guides.length) events.push({ at: order.paidAt, label: `${guides.map((g) => g.title).join(", ")} unlocked, receipt emailed` });
  else events.push({ at: order.paidAt, label: "Receipt emailed" });
  for (const item of order.items.filter((i) => i.kind === "gift_card")) events.push({ at: order.paidAt, label: `${item.title} emailed` });
  for (const item of order.items.filter((i) => i.kind === "print")) {
    const copy = copiesOfItem(item.id)[0];
    const edition = editionById(item.editionId);
    if (copy?.printedAt && edition) events.push({ at: copy.printedAt, label: `${item.title} ${copy.number}/${edition.editionSize} printed and signed` });
  }
  if (order.shipment?.labelCreatedAt) events.push({ at: order.shipment.labelCreatedAt, label: `Shipping label created · ${formatTrackingNo(order.shipment.trackingNo)}` });
  if (order.shipment?.shippedAt) {
    const carrier = order.shippingMethod ? SHIPPING[order.shippingMethod].label : order.shipment.carrier;
    events.push({ at: order.shipment.shippedAt, label: `Shipped · ${carrier} · ${order.shipment.trackingNo}` });
  }
  if (order.shipment?.deliveredAt) events.push({ at: order.shipment.deliveredAt, label: "Delivered" });
  for (const r of order.refunds) events.push({ at: r.createdAt, label: `Refunded ${formatPrice(r.amountCents)} · ${r.reason}` });
  // Open threads only: a message waiting for an answer belongs on the order; answered ones stay in the support inbox.
  for (const t of threadsOfOrder(order.id).filter((t) => t.status === "open")) events.push({ at: t.createdAt, label: `Customer wrote: ${t.subject}` });
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

const normalizeNumber = (n: string) => n.replace(/^#/, "").replace(/^(GS-)?/i, "GS-").toUpperCase();

/** Newest first. */
export async function getOrders(query: OrdersQuery = {}): Promise<Order[]> {
  const search = query.search?.trim().toLowerCase();
  return clone(
    allOrders()
      .filter((o) => !query.customerId || o.userId === query.customerId)
      .filter((o) => !query.kind || o.items.some((i) => i.kind === query.kind))
      .map(mapOrder)
      .filter((o) => !query.tab || inOrderTab(o, query.tab))
      .filter((o) => !search || [o.number, o.customer.fullName, o.customer.email].some((v) => v.toLowerCase().includes(search)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

/** Accepts "GS-2041", "#GS-2041" or "2041". */
export async function getOrder(number: string): Promise<OrderDetail | null> {
  const row = orderByNumber(normalizeNumber(number));
  if (!row) return null;
  const order = mapOrder(row);
  const history = customerTotals(row.userId, row.createdAt);
  return clone({
    ...order,
    timeline: timeline(order),
    customerOrdersCount: history.ordersCount,
    customerLifetimeCents: history.spentCents,
    customerPhone: customerById(row.userId)?.phone ?? null,
    vatLabel: vatLabel(row),
    vatRatePct: Math.round(vatRateAt(orderCountry(row), row.paidAt) * 1000) / 10,
    country: orderCountry(row),
    supportThreads: threadsOfOrder(row.id).map(mapThread),
    payment: paymentOf(row),
  });
}

/** How the order was paid, from its payment row (an order of this browser: the test card, 3DS unknown). */
function paymentOf(row: OrderRow): OrderDetail["payment"] {
  const p = allPayments().find((x) => x.orderId === row.id && x.status === "succeeded");
  if (!p) return { label: row.cardLast4 ? `Card ···${row.cardLast4}` : "Card", threeDS: "unknown" };
  const label = p.method === "paypal" ? "PayPal" : p.wallet === "apple_pay" ? "Apple Pay" : p.wallet === "google_pay" ? "Google Pay" : `Card ···${row.cardLast4}`;
  return { label, threeDS: p.threeDS };
}

/** The country the VAT of an order follows: billing country, else shipping address, else the customer's. */
const orderCountry = (row: OrderRow) => row.country ?? row.shippingAddress?.country ?? customerById(row.userId)?.defaultAddress.country ?? "";

/** The VAT part of an order's total, by the rule in force when it was paid (src/lib/api/vat.ts). */
export const orderVatCents = (row: OrderRow) => includedVatCents(vatableCents(row.items, row.totalCents), orderCountry(row), vatRateAt(orderCountry(row), row.paidAt));

/** "VAT included (FR 20%)"; a sale to another EU country under the €10,000 threshold carries French VAT. */
function vatLabel(row: OrderRow): string | null {
  const country = orderCountry(row);
  const rate = vatRateAt(country, row.paidAt);
  const whose = country !== "FR" && rate === 0.2 ? "FR" : country;
  return rate && orderVatCents(row) > 0 ? `VAT included (${whose} ${Math.round(rate * 1000) / 10}%)` : null;
}

/** Paid orders can be refunded, partly refunded ones while money is left (docs/admin-v2/05 "Refunds"). */
export const REFUNDABLE_STATUSES: ReadonlyArray<OrderRow["status"]> = ["paid", "partially_refunded"];

/** Has any print of the order left the studio (handed to the carrier)? */
function anyPrintShipped(row: OrderRow): boolean {
  const shipment = shipmentOfOrder(row.id);
  if (shipment?.shippedAt) return true;
  return row.items.some((i) => i.kind === "print" && copiesOfItem(i.id).some((c) => c.fulfilment === "shipped" || c.fulfilment === "delivered"));
}

/**
 * Refund modal choices (AdminOrderDetail): the prints ("returned"; with the shipping only while nothing
 * has shipped), the guides (revokes library access), the whole order. Amounts leave out what was
 * already refunded; a choice appears only when the order has that kind of line. Only paid orders.
 * Taking back a guide the customer opened is the owner's decision (`ownerOnly`).
 */
export async function getRefundOptions(number: string): Promise<RefundOption[]> {
  const row = orderByNumber(normalizeNumber(number));
  if (!row || !REFUNDABLE_STATUSES.includes(row.status)) return [];
  const refunded = refundsOfOrder(row.id).reduce((s, r) => s + r.amountCents, 0);
  const left = Math.max(0, row.totalCents - refunded);
  // Net of the bundle discount: what the customer paid for those lines.
  const sum = (kind: string) => row.items.filter((i) => i.kind === kind).reduce((s, i) => s + i.unitPriceCents * i.quantity - (i.discountCents ?? 0), 0);
  const opened = row.items.some((i) => {
    const ent = i.kind === "guide" ? entitlementOfItem(i.id) : undefined;
    return !!ent?.openedAt && !ent.revokedAt;
  });
  const openedRule = opened ? "The guide was opened: only the owner can take it back." : null;
  const options: RefundOption[] = [];
  const prints = sum("print"), guides = sum("guide");
  const shipping = anyPrintShipped(row) ? 0 : row.shippingCents;
  if (prints && row.items.some((i) => i.kind !== "print")) options.push({ key: "print", label: "Print only (returned)", amountCents: Math.min(left, prints + shipping), ownerOnly: null });
  if (guides && row.items.some((i) => i.kind !== "guide")) options.push({ key: "guide", label: "Guide only (revokes library access)", amountCents: Math.min(left, guides), ownerOnly: openedRule });
  options.push({ key: "full", label: "Full order", amountCents: left, ownerOnly: guides ? openedRule : null });
  return clone(options.filter((o) => o.amountCents > 0));
}

/**
 * @deprecated The board's September figure, kept so existing imports work; nothing reads it. The page
 * shows `ordersThisMonth()` from `@/lib/metrics` (paid orders of the current Paris month).
 */
export const ORDERS_THIS_MONTH = 187;

// ── Customer side (Account › Orders, confirmation, tracking) ────────────────

/** "12/100", "12–13/100" */
export function copyNumbersLabel(i: OrderItem): string {
  const n = i.copyNumbers;
  if (!n.length || !i.edition) return "";
  return `${n.length > 1 ? `${n[0]}–${n[n.length - 1]}` : n[0]}/${i.edition.editionSize}`;
}

/** Receipt wording of the Checkout and Orders boards: "N°03 — Guide, 60×80", "N°07 — Print S, 12/100". */
export function orderLineTitle(i: OrderItem): string {
  if (i.kind === "guide") return `${i.workNumber} — Guide, ${i.config.format ? formatLabel(i.config.format, i.orientation) : ""}`;
  if (i.kind === "print") return `${i.workNumber} — Print ${i.edition?.size ?? ""}, ${copyNumbersLabel(i)}`;
  return i.title;
}

/** Least advanced print of the order, or null without prints. */
const printStage = (o: Order): FulfilmentStatus | null => {
  const prints = o.items.filter((i) => i.kind === "print");
  if (!prints.length) return null;
  return PRINT_STATUS.find(([f]) => prints.some((i) => i.fulfilment === f))?.[0] ?? "delivered";
};

/**
 * Status line of Account › Orders: "Print shipped · arriving Oct 3–5", "Delivered instantly" (Orders
 * board); the other wordings follow them for states the board does not draw.
 */
export function customerOrderStatus(o: Order): string {
  if (o.status === "refunded") return "Refunded";
  if (o.status === "partially_refunded") return "Partly refunded";
  if (o.status === "cancelled") return "Cancelled";
  if (o.status === "pending") return "Payment pending";
  const stage = printStage(o);
  if (!stage) return o.items.every((i) => i.kind === "gift_card") ? "Sent by email" : "Delivered instantly";
  const window = deliveryWindow(o.shippingMethod, o.paidAt);
  if (stage === "delivered" || stage === "returned") return o.shipment?.deliveredAt ? `Print delivered ${shortDate(o.shipment.deliveredAt)}` : "Print delivered";
  if (stage === "shipped") return `Print shipped · arriving ${window}`;
  return `Print in preparation · arriving ${window}`;
}

/**
 * /track?order=: the parcel's steps (Tracking board). Mock: no token check, and the carrier scans
 * come from the mock shipments; later the Boxtal webhook writes them.
 */
export async function getOrderTracking(number: string): Promise<OrderTracking | null> {
  const row = orderByNumber(normalizeNumber(number));
  if (!row) return null;
  const o = mapOrder(row);
  const prints = o.items.filter((i) => i.kind === "print");
  if (!prints.length) return null;
  const carrier = CARRIERS[o.shipment?.carrier ?? carrierOf(o.shippingMethod)];
  const s = o.shipment;
  const raw: Array<[TrackingStep["key"], string, string | null]> = [
    ["ordered", "Ordered", o.paidAt],
    ["printed", "Printed and signed", prints.every((p) => p.printedAt) ? prints.map((p) => p.printedAt!).sort().at(-1)! : null],
    ["handed", `Handed to ${carrier.name}`, s?.shippedAt ?? null],
    ["in_transit", "In transit", s?.inTransitAt ?? null],
    ["out_for_delivery", "Out for delivery", s?.outForDeliveryAt ?? null],
    ["delivered", "Delivered", s?.deliveredAt ?? null],
  ];
  // A step counts only once every step before it happened.
  let reached = 0;
  while (reached < raw.length && raw[reached]![2]) reached++;
  const steps: TrackingStep[] = raw.map(([key, label, at], i) => ({ key, label, at: i < reached ? at : null, done: i < reached, current: i === reached - 1 }));
  const delivered = !!s?.deliveredAt;
  return clone({
    number: o.number,
    shippingMethod: o.shippingMethod,
    carrier: { name: carrier.name, url: carrier.url },
    trackingNo: s?.trackingNo ? formatTrackingNo(s.trackingNo) : null,
    steps,
    delivered,
    deliveryDate: delivered ? s!.deliveredAt! : deliveryRange(o.shippingMethod, o.paidAt).end.toISOString(),
    prints,
    shippingAddress: o.shippingAddress,
    guide: o.items.find((i) => i.kind === "guide")?.workNumber ? { workNumber: o.items.find((i) => i.kind === "guide")!.workNumber! } : null,
  });
}

/** "Colissimo, home" on desktop, "Colissimo" on phones (Tracking, MTracking). */
export const trackingCarrierLine = (t: OrderTracking, phone: boolean) => (phone ? t.carrier.name : deliveryName(t.shippingMethod) || t.carrier.name);
