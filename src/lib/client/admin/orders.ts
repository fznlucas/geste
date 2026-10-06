"use client";

/**
 * Order actions of the admin (future `src/actions/admin/orders.ts`): each checks the role like
 * `requireStaff(role)`, writes the admin overlay ("geste.admin.v1") and the audit log.
 * Vendors go through the adapters (Boxtal labels, Stripe refunds, Resend emails: docs/admin-v2/03); in
 * Mock the label number follows the carrier's format and every email is kept in the Outbox.
 */
import { formatTrackingNo } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { REFUNDABLE_STATUSES, getOrder, getPrintCopies, getRefundOptions, type OrderDetail, type RefundOption, type Shipment } from "@/lib/api";
import { call } from "@/lib/integrations";
import { ForbiddenError, adminNow, audit, insertRow, patchRow, requireStaff } from "../admin";
import { sendEmail } from "./email";

export type Carrier = Shipment["carrier"];

/** Ship the print: carrier select of AdminOrderDetail. */
export const CARRIER_OPTIONS: Array<[Carrier, string]> = [
  ["colissimo", "Colissimo — home"],
  ["mondial_relay", "Mondial Relay"],
  ["chronopost", "Chronopost"],
];

/** Parcel select: the tube follows the largest print. */
export const PARCELS = ["Tube 60 cm · 0.4 kg", "Tube 80 cm · 0.6 kg"] as const;

/** Support may refund up to this amount (docs/admin.md; RLS "support refunds ≤ $50"). */
export const SUPPORT_REFUND_MAX_CENTS = 5000;

async function load(number: string): Promise<OrderDetail> {
  const order = await getOrder(number);
  if (!order) throw new Error(`Order ${number} not found`);
  return order;
}

const firstName = (o: OrderDetail) => o.customer.fullName.split(" ")[0] ?? o.customer.fullName;
const countryOf = (o: OrderDetail) => o.shippingAddress?.country ?? "FR";

/** A label bought through Boxtal (mock: the carrier's number format). */
async function buyLabel(order: OrderDetail, carrier: Carrier, parcel: string): Promise<string> {
  const label = await call("boxtal", "createLabel", `order:${order.id}`, (a) => a.createLabel({ orderId: order.id, orderNumber: order.number, carrier, parcel, country: countryOf(order) }));
  return label.trackingNo;
}

/** Only a paid order ships: not pending, cancelled or refunded in full. */
export async function requireShippable(number: string): Promise<OrderDetail> {
  const order = await load(number);
  if (!REFUNDABLE_STATUSES.includes(order.status)) throw new Error(`#${order.number} is ${order.status === "refunded" ? "refunded" : "not paid"}: it does not ship.`);
  return order;
}

/** The prints of an order that still travel (a refunded print put back in stock does not). */
const travelling = (order: OrderDetail) => order.items.filter((i) => i.kind === "print" && i.fulfilment !== "returned");

/** "Create shipping label": buys the label (Boxtal) once every print is packed, and fills the tracking number. Returns it. */
export async function createLabel(input: { number: string; carrier: Carrier; parcel: string }): Promise<string> {
  requireStaff("fulfilment");
  const order = await requireShippable(input.number);
  if (!travelling(order).every((i) => ["packed", "shipped", "delivered"].includes(i.fulfilment))) throw new Error("Pack the print first: the label goes on the tube.");
  const trackingNo = order.shipment?.trackingNo ?? (await buyLabel(order, input.carrier, input.parcel));
  const now = adminNow();
  if (order.shipment) patchRow("shipments", order.shipment.id, { carrier: input.carrier, parcel: input.parcel, labelCreatedAt: order.shipment.labelCreatedAt ?? now });
  else
    insertRow("shipments", {
      id: `ship-${order.number}`, orderId: order.id, carrier: input.carrier, trackingNo, parcel: input.parcel, status: "label_created",
      labelCreatedAt: now, shippedAt: null, inTransitAt: null, outForDeliveryAt: null, deliveredAt: null,
    });
  audit({ action: "order.label", target: `order:${order.number}`, summary: `${staffName()} created a shipping label for #${order.number}` });
  return formatTrackingNo(trackingNo);
}

/**
 * Ships copies: the one action behind the order detail, the phone, the board and the bulk bar
 * (docs/admin-v2/05). Per order: paid, every travelling print packed, then a label (the one typed or
 * scanned, the one created, or one bought now through Boxtal), the shipped stamp, every copy to
 * Shipped, the customer's email in the Outbox, the audit line. Returns the order numbers shipped.
 */
export async function shipCopies(copyIds: string[], opts: { trackingNo?: string; carrier?: Carrier; parcel?: string } = {}): Promise<string[]> {
  requireStaff("fulfilment");
  const copies = (await getPrintCopies()).filter((c) => copyIds.includes(c.id));
  const numbers = [...new Set(copies.map((c) => c.orderNumber).filter((n): n is string => !!n))];
  const shipped: string[] = [];
  for (const number of numbers) {
    const order = await requireShippable(number);
    if (order.shipment?.shippedAt) continue;
    const prints = travelling(order);
    if (!prints.length) throw new Error(`#${number} has no print to ship.`);
    if (!prints.every((i) => i.fulfilment === "packed")) throw new Error(`#${number}: pack every print before it ships.`);
    const now = adminNow();
    const carrier = opts.carrier ?? order.shipment?.carrier ?? (order.shippingMethod === "mondial_relay" ? "mondial_relay" : order.shippingMethod === "chronopost_express" ? "chronopost" : "colissimo");
    const parcel = opts.parcel ?? order.shipment?.parcel ?? PARCELS[0];
    const typed = (opts.trackingNo ?? "").replace(/\s+/g, "").toUpperCase();
    const trackingNo = typed || order.shipment?.trackingNo || (await buyLabel(order, carrier, parcel));
    if (order.shipment) patchRow("shipments", order.shipment.id, { trackingNo, carrier, parcel, labelCreatedAt: order.shipment.labelCreatedAt ?? now, shippedAt: now });
    else
      insertRow("shipments", {
        id: `ship-${order.number}`, orderId: order.id, carrier, trackingNo, parcel, status: "label_created",
        labelCreatedAt: now, shippedAt: now, inTransitAt: null, outForDeliveryAt: null, deliveredAt: null,
      });
    for (const item of prints) {
      for (const id of item.copyIds) patchRow("print_copies", id, { fulfilment: "shipped" });
      patchRow("order_items", item.id, { fulfilment: "shipped" });
    }
    audit({ action: "order.ship", target: `order:${order.number}`, summary: `${staffName()} marked #${order.number} as shipped` });
    await sendEmail("shipping", order.customer.email, `order:${order.id}`, { firstName: firstName(order), orderNumber: order.number, trackingNo: formatTrackingNo(trackingNo), carrier: CARRIER_OPTIONS.find(([c]) => c === carrier)?.[1] ?? carrier });
    shipped.push(number);
  }
  return shipped;
}

/** "Mark as shipped and notify": `shipCopies` for every print of the order. */
export async function markShipped(input: { number: string; trackingNo?: string; carrier?: Carrier; parcel?: string }) {
  const order = await load(input.number);
  const ids = travelling(order).flatMap((i) => i.copyIds);
  if (!ids.length) throw new Error("This order has no print to ship.");
  await shipCopies(ids, input);
}

/**
 * Back from Shipped (a mistake, the parcel is still here): only before the carrier's first scan. Every
 * print returns to Packed and the shipment keeps its label but loses its shipped stamp.
 */
export async function unship(number: string): Promise<void> {
  requireStaff("fulfilment");
  const order = await load(number);
  const s = order.shipment;
  if (!s?.shippedAt) return;
  if (s.inTransitAt || s.outForDeliveryAt || s.deliveredAt) throw new Error("The carrier has scanned the parcel: it cannot come back.");
  patchRow("shipments", s.id, { shippedAt: null, status: "label_created" });
  for (const item of travelling(order)) {
    for (const id of item.copyIds) patchRow("print_copies", id, { fulfilment: "packed" });
    patchRow("order_items", item.id, { fulfilment: "packed" });
  }
  audit({ action: "order.unship", target: `order:${order.number}`, summary: `${staffName()} moved #${order.number} back to Packed (not scanned by the carrier)` });
}

/** "Generate certificate": the certificate of each numbered copy (PDF later), once the print is signed. Returns "#C-07-S-012". */
export async function generateCertificate(number: string): Promise<string> {
  requireStaff("fulfilment");
  const order = await load(number);
  const prints = travelling(order);
  if (!prints.length || prints.some((i) => i.fulfilment === "to_print")) throw new Error("Print and sign it first: the certificate is signed with the print.");
  const certs = prints.filter((i) => i.certificateNo).map((i) => `#${i.certificateNo}`);
  audit({ action: "print.certificate", target: `order:${order.number}`, summary: `${staffName()} generated certificate ${certs.join(", ")} for #${order.number}` });
  return certs.join(", ");
}

export async function resendAccess(number: string) {
  requireStaff("support");
  const order = await load(number);
  await sendEmail("library_access", order.customer.email, `order:${order.id}`, { firstName: firstName(order) });
  audit({ action: "order.resend_access", target: `order:${order.number}`, summary: `${staffName()} resent library access for #${order.number}` });
}

export async function resendReceipt(number: string) {
  requireStaff("support");
  const order = await load(number);
  await sendEmail("receipt", order.customer.email, `order:${order.id}`, { firstName: firstName(order), orderNumber: order.number, totalLabel: formatPrice(order.totalCents) });
  audit({ action: "order.resend_receipt", target: `order:${order.number}`, summary: `${staffName()} resent the receipt of #${order.number}` });
}

export async function addOrderNote(number: string, body: string) {
  const staff = requireStaff(["support", "fulfilment"]);
  const text = body.trim();
  if (!text) throw new Error("Write the note first.");
  insertRow(
    "order_notes",
    { orderNumber: number, body: text, staffName: staff.fullName, at: adminNow() },
    { action: "order.note", target: `order:${number}`, summary: `${staff.fullName} added a note to #${number}` },
  );
}

/** Refund modal reasons ("Reason — sent to the customer"). */
export const REFUND_REASONS = ["Print damaged in transit", "Changed their mind (14 days)", "Duplicate order", "Other"] as const;

/** The largest refund a role may make, or 0 when it cannot refund. */
export function refundLimitCents(role: string | undefined): number {
  if (role === "owner") return Number.POSITIVE_INFINITY;
  if (role === "support") return SUPPORT_REFUND_MAX_CENTS;
  return 0;
}

/** Why this role cannot make this refund, or null: the modal disables the confirm and says it. */
export function refundBlocked(option: Pick<RefundOption, "amountCents" | "ownerOnly">, role: string | undefined): string | null {
  if (option.ownerOnly && role !== "owner") return option.ownerOnly;
  if (option.amountCents > refundLimitCents(role)) return `Support can refund up to ${formatPrice(SUPPORT_REFUND_MAX_CENTS)}. Ask the owner for this one.`;
  return null;
}

/**
 * The share of a refund that goes back onto the gift cards the order was paid with, in proportion to
 * what they paid, never more than they paid net of earlier refunds onto them.
 */
function giftCardShare(order: OrderDetail, amountCents: number, earlier: Array<{ giftCardId: string; cents: number }>): Array<{ giftCardId: string; cents: number }> {
  const paid = order.giftCardRedemptions;
  const total = paid.reduce((s, g) => s + g.cents, 0);
  if (!total || !order.totalCents) return [];
  let share = Math.min(Math.round((amountCents * total) / order.totalCents), amountCents);
  const out: Array<{ giftCardId: string; cents: number }> = [];
  for (const g of paid) {
    const room = g.cents - earlier.filter((e) => e.giftCardId === g.giftCardId).reduce((s, e) => s + e.cents, 0);
    const cents = Math.max(0, Math.min(room, share));
    if (cents) out.push({ giftCardId: g.giftCardId, cents });
    share -= cents;
  }
  return out;
}

/**
 * Refund (docs/admin-v2/05 "Refunds"): paid orders only, within what is left, Support ≤ $50, an opened
 * guide only by the owner. In one go: the refund row (books, Stripe balance and gift cards follow from
 * it), guides revoked, unshipped copies back in stock (their numbers free again), the order's status,
 * the email in the Outbox, the audit line.
 */
export async function refundOrder(input: { number: string; option: RefundOption["key"]; reason: string; restock: boolean }) {
  const staff = requireStaff("support");
  const order = await load(input.number);
  if (!REFUNDABLE_STATUSES.includes(order.status)) throw new Error("Only a paid order can be refunded.");
  if (!input.reason.trim()) throw new Error("Give a reason: it is sent to the customer.");
  const option = (await getRefundOptions(order.number)).find((o) => o.key === input.option);
  if (!option) throw new Error("Nothing left to refund on this choice.");
  const blocked = refundBlocked(option, staff.role);
  if (blocked) throw new ForbiddenError(blocked);
  const now = adminNow();
  const giftCards = giftCardShare(order, option.amountCents, order.refunds.flatMap((r) => r.giftCards ?? []));
  const toCard = option.amountCents - giftCards.reduce((s, g) => s + g.cents, 0);
  if (toCard > 0) await call("stripe-payments", "refund", `order:${order.id}`, (a) => a.refund({ orderId: order.id, amountCents: toCard, reason: input.reason }));
  const guides = input.option !== "print" ? order.items.filter((i) => i.kind === "guide") : [];
  const prints = input.option !== "guide" ? order.items.filter((i) => i.kind === "print") : [];
  // Only copies still in the studio go back on sale; a shipped one comes back by post first.
  const restocked = input.restock ? prints.filter((p) => p.fulfilment !== "shipped" && p.fulfilment !== "delivered").flatMap((p) => p.copyIds) : [];
  insertRow("refunds", { orderId: order.id, amountCents: option.amountCents, reason: input.reason, restock: restocked.length > 0, revokeAccess: guides.length > 0, createdAt: now, ...(giftCards.length ? { giftCards } : {}) });
  for (const g of guides) if (g.entitlementId && !g.accessRevoked) patchRow("entitlements", g.entitlementId, { revokedAt: now });
  for (const id of restocked) patchRow("print_copies", id, { status: "available", fulfilment: "returned" });
  const refunded = order.refunds.reduce((s, r) => s + r.amountCents, 0) + option.amountCents;
  patchRow("orders", order.id, { status: refunded >= order.totalCents ? "refunded" : "partially_refunded" }, {
    action: "order.refund",
    target: `order:${order.number}`,
    summary: `${staff.fullName} refunded #${order.number} · ${formatPrice(option.amountCents)}${giftCards.length ? ` (${formatPrice(option.amountCents - toCard)} onto the gift card)` : ""}${restocked.length ? ` · ${restocked.length} ${restocked.length === 1 ? "copy" : "copies"} back in stock` : ""}`,
  });
  await sendEmail("refund", order.customer.email, `order:${order.id}`, { firstName: firstName(order), orderNumber: order.number, amountLabel: formatPrice(option.amountCents), reason: input.reason });
}

function staffName(): string {
  return requireStaff().fullName;
}
