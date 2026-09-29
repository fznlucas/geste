"use client";

/**
 * Order actions of the admin (future `src/actions/admin/orders.ts`): each checks the role like
 * `requireStaff(role)`, writes the admin overlay ("geste.admin.v1") and the audit log.
 * Mock: no Boxtal label, no Stripe refund, no email; the rows and the timeline follow as they will.
 */
import { formatTrackingNo } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { getOrder, getPrintCopies, getRefundOptions, type OrderDetail, type RefundOption, type Shipment } from "@/lib/api";
import { ForbiddenError, adminNow, audit, insertRow, patchRow, requireStaff } from "../admin";

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

/** A Colissimo-like number, "6A" + 11 digits (shown "6A 123 456 789 01"). */
function mockTrackingNo(orderNumber: string): string {
  const n = Number(orderNumber.replace(/\D/g, "")) || 0;
  return `6A${String(n).padStart(4, "0")}${String((n * 7919) % 10_000_000).padStart(7, "0")}`;
}

/** "Create shipping label": buys the label (Boxtal later) and fills the tracking number. Returns it. */
export async function createLabel(input: { number: string; carrier: Carrier; parcel: string }): Promise<string> {
  requireStaff("fulfilment");
  const order = await load(input.number);
  const trackingNo = order.shipment?.trackingNo ?? mockTrackingNo(order.number);
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

/** "Mark as shipped and notify": the shipment leaves, every copy of the order moves to Shipped, the customer gets the tracking link. */
export async function markShipped(input: { number: string; trackingNo?: string; carrier?: Carrier; parcel?: string }) {
  requireStaff("fulfilment");
  const order = await load(input.number);
  const prints = order.items.filter((i) => i.kind === "print");
  if (!prints.length) throw new Error("This order has no print to ship.");
  const now = adminNow();
  const trackingNo = (input.trackingNo ?? "").replace(/\s+/g, "").toUpperCase() || order.shipment?.trackingNo || mockTrackingNo(order.number);
  const carrier = input.carrier ?? order.shipment?.carrier ?? (order.shippingMethod === "mondial_relay" ? "mondial_relay" : order.shippingMethod === "chronopost_express" ? "chronopost" : "colissimo");
  const parcel = input.parcel ?? order.shipment?.parcel ?? PARCELS[0];
  if (order.shipment) patchRow("shipments", order.shipment.id, { trackingNo, carrier, parcel, shippedAt: order.shipment.shippedAt ?? now });
  else
    insertRow("shipments", {
      id: `ship-${order.number}`, orderId: order.id, carrier, trackingNo, parcel, status: "label_created",
      labelCreatedAt: null, shippedAt: now, inTransitAt: null, outForDeliveryAt: null, deliveredAt: null,
    });
  // A copy shipped straight from "To print" is printed now; one already printed keeps its date (certificate).
  const printed = new Map((await getPrintCopies()).map((c) => [c.id, c.printedAt]));
  for (const item of prints) {
    for (const id of item.copyIds) patchRow("print_copies", id, { fulfilment: "shipped", printedAt: printed.get(id) ?? now });
    patchRow("order_items", item.id, { fulfilment: "shipped" });
  }
  audit({ action: "order.ship", target: `order:${order.number}`, summary: `${staffName()} marked #${order.number} as shipped` });
}

/** "Generate certificate": the certificate of each numbered copy (PDF later). Returns "#C-07-012". */
export async function generateCertificate(number: string): Promise<string> {
  requireStaff("fulfilment");
  const order = await load(number);
  const certs = order.items.filter((i) => i.certificateNo).map((i) => `#${i.certificateNo}`);
  audit({ action: "print.certificate", target: `order:${order.number}`, summary: `${staffName()} generated certificate ${certs.join(", ")} for #${order.number}` });
  return certs.join(", ");
}

export async function resendAccess(number: string) {
  requireStaff("support");
  const order = await load(number);
  audit({ action: "order.resend_access", target: `order:${order.number}`, summary: `${staffName()} resent library access for #${order.number}` });
}

export async function resendReceipt(number: string) {
  requireStaff("support");
  const order = await load(number);
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

/**
 * Refund (Stripe later). Guide lines lose their library access; "Put … back in stock" frees the
 * numbered copies. The order becomes Refunded, or Partly refunded while money is left.
 */
export async function refundOrder(input: { number: string; option: RefundOption["key"]; reason: string; restock: boolean }) {
  const staff = requireStaff("support");
  const order = await load(input.number);
  const option = (await getRefundOptions(order.number)).find((o) => o.key === input.option);
  if (!option) throw new Error("Nothing left to refund on this choice.");
  if (option.amountCents > refundLimitCents(staff.role)) throw new ForbiddenError(`Support can refund up to ${formatPrice(SUPPORT_REFUND_MAX_CENTS)}. Ask the owner.`);
  const now = adminNow();
  const guides = input.option !== "print" ? order.items.filter((i) => i.kind === "guide") : [];
  const prints = input.option !== "guide" ? order.items.filter((i) => i.kind === "print") : [];
  insertRow("refunds", { orderId: order.id, amountCents: option.amountCents, reason: input.reason, restock: input.restock && prints.length > 0, revokeAccess: guides.length > 0, createdAt: now });
  for (const g of guides) if (g.entitlementId && !g.accessRevoked) patchRow("entitlements", g.entitlementId, { revokedAt: now });
  if (input.restock) for (const p of prints) for (const id of p.copyIds) patchRow("print_copies", id, { status: "available", fulfilment: "returned" });
  const refunded = order.refunds.reduce((s, r) => s + r.amountCents, 0) + option.amountCents;
  patchRow("orders", order.id, { status: refunded >= order.totalCents ? "refunded" : "partially_refunded" }, {
    action: "order.refund",
    target: `order:${order.number}`,
    summary: `${staff.fullName} refunded #${order.number} · ${formatPrice(option.amountCents)}`,
  });
}

function staffName(): string {
  return requireStaff().fullName;
}
