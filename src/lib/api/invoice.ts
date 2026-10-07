/**
 * The invoice of an order (Orders › "Invoice PDF"), as text lines for the PDF writer. Pure: the order
 * and the VAT regime in, the lines out, so each regime is tested (tests/unit/invoice.test.ts).
 * - Franchise en base: no VAT anywhere, and the mention "TVA non applicable, art. 293 B du CGI".
 * - Collecting VAT: amounts excl. VAT, the VAT of each rate, the total; no franchise mention. A gift card
 *   sold carries no VAT (a voucher, taxed when used); a sale outside the EU is an export at 0 %.
 * Prices are charged in USD: the VAT is also given in euros at the day's rate (a French invoice states
 * its VAT in euros). Numbering, mentions and the export wording: to confirm with the accountant.
 */
import type { VatRegime } from "@/config/business";
import { parisDay } from "@/lib/clock";
import { fxRate, toEur } from "@/lib/ledger/fx";
import { formatPrice } from "@/lib/format";
import type { PdfLine } from "@/lib/pdf";
import { orderLineTitle } from "./orders";
import { storeSetting } from "./settings";
import type { OrderDetail } from "./types";

export const FRANCHISE_MENTION = "TVA non applicable, art. 293 B du CGI";

export interface InvoiceVatRow {
  /** 20, 21…; 0 for an export or a gift card. */
  ratePct: number;
  /** "VAT 20%", "VAT 0% · export outside the EU", "No VAT · gift card (voucher)". */
  label: string;
  /** Amount excl. VAT, VAT, in the order's currency (USD cents). */
  baseCents: number;
  vatCents: number;
}

export interface InvoiceVat {
  /** The franchise mention, only under the franchise. */
  mention: string | null;
  /** By rate, under the collecting regime; empty under the franchise. */
  rows: InvoiceVatRow[];
  totalExVatCents: number;
  totalVatCents: number;
  /** The VAT in euros at the payment day's rate. */
  totalVatEurCents: number;
}

type InvoiceOrder = Pick<OrderDetail, "items" | "totalCents" | "vatRatePct" | "country" | "paidAt">;

/** The VAT part of the invoice for a regime. */
export function invoiceVat(o: InvoiceOrder, regime: VatRegime): InvoiceVat {
  if (regime === "franchise") return { mention: FRANCHISE_MENTION, rows: [], totalExVatCents: o.totalCents, totalVatCents: 0, totalVatEurCents: 0 };
  const cards = o.items.filter((i) => i.kind === "gift_card").reduce((s, i) => s + i.unitPriceCents * i.quantity - i.discountCents, 0);
  const taxed = Math.max(0, o.totalCents - cards);
  const rows: InvoiceVatRow[] = [];
  if (taxed > 0) {
    const rate = o.vatRatePct / 100;
    const base = Math.round(taxed / (1 + rate));
    rows.push({ ratePct: o.vatRatePct, label: o.vatRatePct ? `VAT ${o.vatRatePct}%` : `VAT 0% · export outside the EU (${o.country || "abroad"})`, baseCents: base, vatCents: taxed - base });
  }
  if (cards > 0) rows.push({ ratePct: 0, label: "No VAT · gift card (voucher, taxed when used)", baseCents: cards, vatCents: 0 });
  const totalVatCents = rows.reduce((s, r) => s + r.vatCents, 0);
  return {
    mention: null,
    rows,
    totalExVatCents: rows.reduce((s, r) => s + r.baseCents, 0),
    totalVatCents,
    totalVatEurCents: toEur(totalVatCents, fxRate(parisDay(o.paidAt))),
  };
}

const eur = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(cents / 100);

/** The invoice's lines: seller, buyer, items as charged, then the VAT of the regime. */
export function invoiceLines(o: OrderDetail, regime: VatRegime): PdfLine[] {
  const v = invoiceVat(o, regime);
  return [
    { text: `Invoice F-${o.number}`, size: 16 },
    { text: `Date: ${o.paidAt.slice(0, 10)} · paid by card ···${o.cardLast4}` },
    { text: storeSetting("store.name"), gap: 14 },
    { text: storeSetting("store.legal_entity") },
    { text: storeSetting("store.domain") },
    { text: "Billed to", gap: 14 },
    { text: o.customer.fullName },
    { text: o.customer.email },
    ...(o.shippingAddress ? [{ text: `${o.shippingAddress.line1}, ${o.shippingAddress.postalCode} ${o.shippingAddress.city}, ${o.shippingAddress.country}` }] : []),
    { text: "Items", gap: 14 },
    ...o.items.map((i) => ({ text: `${orderLineTitle(i)} · ${i.quantity} × ${formatPrice(i.unitPriceCents)}${i.discountCents ? ` − ${formatPrice(i.discountCents)}` : ""}` })),
    ...(o.shippingCents ? [{ text: `Shipping · ${formatPrice(o.shippingCents)}` }] : []),
    ...(v.mention
      ? [{ text: `Total · ${formatPrice(o.totalCents)}`, size: 12, gap: 10 }, { text: v.mention }]
      : [
          { text: `Total excl. VAT · ${formatPrice(v.totalExVatCents)}`, gap: 10 },
          ...v.rows.map((r) => ({ text: `${r.label} · on ${formatPrice(r.baseCents)} · ${formatPrice(r.vatCents)}` })),
          { text: `Total incl. VAT · ${formatPrice(o.totalCents)}`, size: 12 },
          ...(v.totalVatCents ? [{ text: `VAT in euros · ${eur(v.totalVatEurCents)} (rate of ${parisDay(o.paidAt)})` }] : []),
        ]),
    ...(o.refunds.length ? [{ text: `Refunded · ${formatPrice(o.refunds.reduce((s, r) => s + r.amountCents, 0))}`, gap: 6 }] : []),
  ];
}
