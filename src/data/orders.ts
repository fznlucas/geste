/**
 * Orders of AdminOrders (#GS-2031 … #GS-2041) plus older ones so repeat buyers have a history.
 * Every price is recomputed with src/lib/pricing.ts: where a board shows another total, the code wins
 * (docs/decisions.md). VAT is included in the total, as on AdminOrderDetail.
 */
import { FORMATS, LEVELS, SHIPPING, guidePriceCents, resolveLevel, type FormatKey, type LevelKey, type ShippingMethod } from "@/lib/pricing";
import { customers } from "./customers";
import { printCopies, printEditions } from "./editions";
import { guideId } from "./guides";
import { includedVatCents } from "./tax";
import { palettes, works } from "./works";
import type { OrderItemRow, OrderRow, OrderStatus, PaletteKey, RefundRow, ShipmentRow } from "./types";

type Line =
  | { kind: "guide"; work: number; format?: FormatKey; level?: LevelKey; palette?: PaletteKey }
  | { kind: "print"; edition: string }
  | { kind: "gift_card"; cents: number };

function item(orderNumber: number, index: number, line: Line): OrderItemRow {
  const id = `item-${orderNumber}-${index + 1}`;
  if (line.kind === "gift_card") {
    return { id, kind: "gift_card", workId: null, guideId: null, editionId: null, config: {}, title: `Gift card $${line.cents / 100}`, detail: "Sent by email", unitPriceCents: line.cents, quantity: 1, fulfilment: "not_required" };
  }
  if (line.kind === "print") {
    const edition = printEditions.find((e) => e.id === line.edition)!;
    const work = works.find((w) => w.id === edition.workId)!;
    const copy = printCopies.find((c) => c.orderItemId === id);
    return {
      id, kind: "print", workId: work.id, guideId: null, editionId: edition.id, config: {},
      title: `Print ${work.number}`,
      detail: `${edition.size} · edition ${copy?.number ?? "–"}/${edition.editionSize}`,
      unitPriceCents: edition.priceCents, quantity: 1, fulfilment: copy?.fulfilment ?? "to_print",
    };
  }
  const work = works[line.work - 1]!;
  const format = line.format ?? work.defaultFormat;
  const level = line.level ?? "match";
  const palette = line.palette ?? "original";
  const resolved = resolveLevel({ format, level, palette });
  const paletteName = palettes.find((p) => p.workId === work.id && p.key === palette)!.name;
  return {
    id, kind: "guide", workId: work.id, guideId: guideId(work.slug, format, resolved), editionId: null,
    config: { format, level: resolved, palette },
    title: `Guide ${work.number}`,
    detail: `${FORMATS[format].label} · ${LEVELS[resolved].label} · ${paletteName}`,
    unitPriceCents: guidePriceCents({ format, level, palette }), quantity: 1, fulfilment: "not_required",
  };
}

function order(number: number, at: string, customerSlug: string, lines: Line[], opts: { shipping?: ShippingMethod; status?: OrderStatus; last4?: string; risk?: OrderRow["risk"] } = {}): OrderRow {
  const customer = customers.find((c) => c.id === `cus-${customerSlug}`)!;
  const items = lines.map((l, i) => item(number, i, l));
  const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const hasPrint = items.some((i) => i.kind === "print");
  const shippingMethod = hasPrint ? (opts.shipping ?? "colissimo") : null;
  const shippingCents = shippingMethod ? SHIPPING[shippingMethod].cents : 0;
  const totalCents = subtotalCents + shippingCents;
  return {
    id: `order-${number}`,
    number: `GS-${number}`,
    userId: customer.id,
    email: customer.email,
    status: opts.status ?? "paid",
    subtotalCents,
    discountCents: 0,
    shippingCents,
    shippingMethod,
    taxCents: includedVatCents(totalCents, customer.defaultAddress.country),
    totalCents,
    shippingAddress: hasPrint ? customer.defaultAddress : null,
    stripePaymentIntent: `pi_mock_${number}`,
    cardLast4: opts.last4 ?? "4242",
    risk: opts.risk ?? "low",
    withdrawalWaived: items.some((i) => i.kind === "guide"),
    paidAt: at,
    createdAt: at,
    items,
  };
}

export const orders: OrderRow[] = [
  order(2041, "2026-10-01T14:02:00Z", "camille-martin", [{ kind: "guide", work: 3 }, { kind: "print", edition: "ed-07-a3" }]),
  order(2040, "2026-10-01T09:15:00Z", "hugo-petit", [{ kind: "guide", work: 1, format: "30x40" }], { last4: "1881" }),
  order(2039, "2026-09-30T18:20:00Z", "lea-dubois", [{ kind: "gift_card", cents: 5000 }], { last4: "0005" }),
  order(2038, "2026-09-30T11:20:00Z", "ines-moreau", [{ kind: "guide", work: 8 }, { kind: "print", edition: "ed-01-a2" }], { last4: "3220" }),
  order(2037, "2026-09-30T08:05:00Z", "tom-laurent", [{ kind: "guide", work: 2 }], { last4: "7310" }),
  order(2036, "2026-09-29T20:10:00Z", "sarah-cohen", [{ kind: "print", edition: "ed-07-a3" }], { shipping: "mondial_relay", last4: "9424" }),
  order(2035, "2026-09-29T12:30:00Z", "yanis-benali", [{ kind: "guide", work: 4 }], { last4: "5100", risk: "medium" }),
  order(2034, "2026-09-28T21:00:00Z", "emma-roux", [{ kind: "guide", work: 5 }, { kind: "guide", work: 9 }], { last4: "6011" }),
  order(2033, "2026-09-28T16:25:00Z", "jules-fabre", [{ kind: "print", edition: "ed-08-50x70" }], { last4: "4000" }),
  order(2032, "2026-09-27T15:40:00Z", "chloe-garnier", [{ kind: "guide", work: 3 }], { last4: "2222" }),
  order(2031, "2026-09-27T10:05:00Z", "nina-keller", [{ kind: "print", edition: "ed-01-a3" }], { shipping: "international", last4: "8431" }),
  order(2030, "2026-09-26T18:40:00Z", "paul-girard", [{ kind: "guide", work: 6 }, { kind: "guide", work: 4 }], { last4: "1117" }),
  order(2029, "2026-09-25T13:35:00Z", "maya-lopez", [{ kind: "print", edition: "ed-02-a3" }, { kind: "guide", work: 12 }], { shipping: "international", last4: "3056" }),
  order(2025, "2026-09-24T09:05:00Z", "adam-faure", [{ kind: "guide", work: 8 }], { status: "refunded", last4: "0341" }),
  order(2021, "2026-09-22T19:45:00Z", "tom-laurent", [{ kind: "guide", work: 15 }], { last4: "7310" }),
  order(2019, "2026-09-21T10:30:00Z", "lea-dubois", [{ kind: "guide", work: 12, palette: "earth" }], { last4: "0005" }),
  order(2017, "2026-09-20T15:00:00Z", "yanis-benali", [{ kind: "guide", work: 14 }], { last4: "5100" }),
  order(2016, "2026-09-20T07:50:00Z", "nina-keller", [{ kind: "guide", work: 11 }], { last4: "8431" }),
  order(2014, "2026-09-19T14:05:00Z", "chloe-garnier", [{ kind: "print", edition: "ed-05-a3" }], { shipping: "international", last4: "2222" }),
  order(2012, "2026-09-18T12:10:00Z", "camille-martin", [{ kind: "gift_card", cents: 3000 }]),
  order(2010, "2026-09-17T10:00:00Z", "emma-roux", [{ kind: "guide", work: 3, format: "30x40" }], { last4: "6011" }),
  order(2008, "2026-09-16T12:45:00Z", "yanis-benali", [{ kind: "guide", work: 10 }], { last4: "5100" }),
  order(2003, "2026-09-15T19:30:00Z", "tom-laurent", [{ kind: "guide", work: 9 }], { last4: "7310" }),
  order(1994, "2026-09-12T17:05:00Z", "lea-dubois", [{ kind: "guide", work: 2 }], { last4: "0005" }),
  order(1987, "2026-09-10T08:40:00Z", "camille-martin", [{ kind: "guide", work: 7 }, { kind: "guide", work: 1, palette: "warm" }]),
];

export const refunds: RefundRow[] = [
  { id: "refund-2025-1", orderId: "order-2025", amountCents: 2500, reason: "Bought the wrong format", restock: false, revokeAccess: true, createdAt: "2026-09-24T17:00:00Z" },
];

export const shipments: ShipmentRow[] = [
  { id: "ship-2033", orderId: "order-2033", carrier: "colissimo", trackingNo: "6A20331234567", parcel: "Tube 80 cm · 0.6 kg", status: "in_transit", shippedAt: "2026-09-29T16:00:00Z", deliveredAt: null },
  { id: "ship-2029", orderId: "order-2029", carrier: "colissimo", trackingNo: "CA20290045FR", parcel: "Tube 60 cm · 0.4 kg", status: "delivered", shippedAt: "2026-09-26T16:00:00Z", deliveredAt: "2026-09-30T11:00:00Z" },
  { id: "ship-2014", orderId: "order-2014", carrier: "colissimo", trackingNo: "CA20140012FR", parcel: "Tube 60 cm · 0.4 kg", status: "delivered", shippedAt: "2026-09-20T16:00:00Z", deliveredAt: "2026-09-23T10:30:00Z" },
];
