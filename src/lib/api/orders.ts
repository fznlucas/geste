/** Orders (admin and account). */
import { asset } from "@/lib/asset";
import { shortDate } from "@/lib/dates";
import { CARRIERS, carrierOf, deliveryName, deliveryRange, deliveryWindow, formatTrackingNo } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { FORMATS, SHIPPING } from "@/lib/pricing";
import { customers } from "@/data/customers";
import { printEditions } from "@/data/editions";
import { refunds, shipments } from "@/data/orders";
import { supportThreads } from "@/data/support";
import type { OrderRow } from "@/data/types";
import { works } from "@/data/works";
import { clone } from "./clone";
import { allOrders, allPrintCopies } from "./local";
import { mapThread } from "./support";
import type { FulfilmentStatus, Order, OrderDetail, OrderDisplayStatus, OrderEvent, OrderItem, OrdersQuery, OrdersTab, OrderTracking, TrackingStep } from "./types";

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
  if (supportThreads.some((t) => t.orderId === row.id && t.category === "refund" && t.status === "open")) return "Refund asked";
  const prints = row.items.filter((i) => i.kind === "print");
  if (prints.length === 0) return "Delivered";
  return PRINT_STATUS.find(([f]) => prints.some((i) => i.fulfilment === f))?.[1] ?? "Delivered";
}

const TABS: Record<Exclude<OrdersTab, "all">, OrderDisplayStatus[]> = {
  to_ship: ["To ship", "Printed", "Packed"],
  issues: ["Refund asked", "Pending"],
  done: ["Shipped", "Delivered", "Refunded", "Partly refunded", "Cancelled"],
};

export function mapOrder(row: OrderRow): Order {
  const customer = customers.find((c) => c.id === row.userId)!;
  const shipment = shipments.find((s) => s.orderId === row.id);
  const copies = allPrintCopies();
  const items = row.items.map((i) => {
    const work = works.find((w) => w.id === i.workId);
    const itemCopies = copies.filter((c) => c.orderItemId === i.id).sort((a, b) => a.number - b.number);
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
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      fulfilment: i.fulfilment,
      certificateNo: itemCopies[0]?.certificateNo ?? null,
      copyNumbers: itemCopies.map((c) => c.number),
      edition: (() => {
        const e = printEditions.find((x) => x.id === i.editionId);
        return e ? { size: e.size, editionSize: e.editionSize } : null;
      })(),
      printedAt: itemCopies.length && itemCopies.every((c) => c.printedAt) ? itemCopies.map((c) => c.printedAt!).sort().at(-1)! : null,
    };
  });
  const summary = items
    .map((i) => (i.kind === "print" ? `${i.title} ${printEditions.find((e) => e.id === i.editionId)?.size ?? ""}` : i.title))
    .join(" · ");
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    displayStatus: displayStatus(row),
    customer: { id: customer.id, fullName: customer.fullName, email: customer.email },
    summary,
    items,
    subtotalCents: row.subtotalCents,
    discountCents: row.discountCents,
    shippingCents: row.shippingCents,
    shippingMethod: row.shippingMethod,
    taxCents: row.taxCents,
    totalCents: row.totalCents,
    shippingAddress: row.shippingAddress,
    cardLast4: row.cardLast4,
    paymentIntent: row.stripePaymentIntent,
    risk: row.risk,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    refunds: refunds
      .filter((r) => r.orderId === row.id)
      .map(({ id, amountCents, reason, restock, revokeAccess, createdAt }) => ({ id, amountCents, reason, restock, revokeAccess, createdAt })),
    shipment: shipment
      ? { id: shipment.id, carrier: shipment.carrier, trackingNo: shipment.trackingNo, parcel: shipment.parcel, status: shipment.status, shippedAt: shipment.shippedAt, inTransitAt: shipment.inTransitAt, outForDeliveryAt: shipment.outForDeliveryAt, deliveredAt: shipment.deliveredAt }
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
    const copy = allPrintCopies().find((c) => c.orderItemId === item.id);
    const edition = printEditions.find((e) => e.id === item.editionId);
    if (copy?.printedAt && edition) events.push({ at: copy.printedAt, label: `${item.title} ${copy.number}/${edition.editionSize} printed and signed` });
  }
  if (order.shipment?.shippedAt) {
    const carrier = order.shippingMethod ? SHIPPING[order.shippingMethod].label : order.shipment.carrier;
    events.push({ at: order.shipment.shippedAt, label: `Shipped · ${carrier} · ${order.shipment.trackingNo}` });
  }
  if (order.shipment?.deliveredAt) events.push({ at: order.shipment.deliveredAt, label: "Delivered" });
  for (const r of order.refunds) events.push({ at: r.createdAt, label: `Refunded ${formatPrice(r.amountCents)} · ${r.reason}` });
  for (const t of supportThreads.filter((t) => t.orderId === order.id)) events.push({ at: t.createdAt, label: `Customer wrote: ${t.subject}` });
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
      .filter((o) => !query.tab || query.tab === "all" || TABS[query.tab].includes(o.displayStatus))
      .filter((o) => !search || [o.number, o.customer.fullName, o.customer.email].some((v) => v.toLowerCase().includes(search)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

/** Accepts "GS-2041", "#GS-2041" or "2041". */
export async function getOrder(number: string): Promise<OrderDetail | null> {
  const row = allOrders().find((o) => o.number === normalizeNumber(number));
  if (!row) return null;
  const order = mapOrder(row);
  const history = allOrders().filter((o) => o.userId === row.userId && o.createdAt <= row.createdAt && o.status !== "refunded");
  return clone({
    ...order,
    timeline: timeline(order),
    customerOrdersCount: history.length,
    customerLifetimeCents: history.reduce((s, o) => s + o.totalCents, 0),
    supportThreads: supportThreads.filter((t) => t.orderId === row.id).map(mapThread),
  });
}

// ── Customer side (Account › Orders, confirmation, tracking) ────────────────

/** "12/50", "12–13/50" */
export function copyNumbersLabel(i: OrderItem): string {
  const n = i.copyNumbers;
  if (!n.length || !i.edition) return "";
  return `${n.length > 1 ? `${n[0]}–${n[n.length - 1]}` : n[0]}/${i.edition.editionSize}`;
}

/** Receipt wording of the Checkout and Orders boards: "N°03 — Guide, 60×80", "N°07 — Print A3, 12/50". */
export function orderLineTitle(i: OrderItem): string {
  if (i.kind === "guide") return `${i.workNumber} — Guide, ${i.config.format ? FORMATS[i.config.format].label : ""}`;
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
  const row = allOrders().find((o) => o.number === normalizeNumber(number));
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
