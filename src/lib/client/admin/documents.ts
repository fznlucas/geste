"use client";

/**
 * The PDFs the admin downloads (docs/admin-v2/04 Orders): shipping label, certificate of authenticity,
 * invoice. Mock: built in the browser from the order (`src/lib/pdf.ts`); Live: the Boxtal label and the
 * invoice service's file. Each download writes the audit line.
 */
import { copyNumbersLabel, getOrder, invoiceLines, storeSetting, type OrderDetail } from "@/lib/api";
import { vatRegime } from "@/lib/api/vat";
import { formatTrackingNo } from "@/lib/delivery";
import { textPdf, type PdfLine } from "@/lib/pdf";
import { audit, requireStaff } from "../admin";
import { downloadFile } from "./download";
import { CARRIER_OPTIONS } from "./orders";

const PDF = "application/pdf";
const day = (iso: string) => iso.slice(0, 10);

async function load(number: string): Promise<OrderDetail> {
  const order = await getOrder(number);
  if (!order) throw new Error(`Order ${number} not found`);
  return order;
}

/** "Label ready · PDF": the label of the order's shipment (4 × 6 in). */
export async function downloadLabel(number: string): Promise<void> {
  const staff = requireStaff("fulfilment");
  const o = await load(number);
  const s = o.shipment;
  if (!s) throw new Error("Create the shipping label first.");
  const a = o.shippingAddress;
  const lines: PdfLine[] = [
    { text: CARRIER_OPTIONS.find(([c]) => c === s.carrier)?.[1] ?? s.carrier, size: 14 },
    { text: formatTrackingNo(s.trackingNo), size: 16, gap: 6 },
    { text: `||| ${s.trackingNo} |||`, size: 12 },
    { text: "To", gap: 14 },
    ...(a ? [a.name, a.line1, a.line2, `${a.postalCode} ${a.city}`, a.country].filter((x): x is string => !!x).map((text) => ({ text, size: 12 })) : [{ text: "No address" }]),
    { text: "From", gap: 14 },
    { text: storeSetting("store.name") },
    { text: storeSetting("store.legal_entity") },
    { text: `Parcel: ${s.parcel}`, gap: 14 },
    { text: `Order #${o.number}` },
  ];
  downloadFile(`label-${o.number}.pdf`, textPdf(lines, "label"), PDF);
  audit({ action: "order.label_pdf", target: `order:${o.number}`, summary: `${staff.fullName} downloaded the shipping label of #${o.number}` });
}

/** "Generate certificate": one page per numbered copy, once signed ("N°07 · S · 12/100 · C-07-S-012"). */
export async function downloadCertificate(number: string): Promise<void> {
  const staff = requireStaff("fulfilment");
  const o = await load(number);
  const prints = o.items.filter((i) => i.kind === "print" && i.certificateNo);
  if (!prints.length || prints.some((i) => !i.printedAt)) throw new Error("Print and sign it first: the certificate is signed with the print.");
  for (const p of prints) {
    const lines: PdfLine[] = [
      { text: "Certificate of authenticity", size: 18 },
      { text: storeSetting("store.name"), gap: 8 },
      { text: `${p.workNumber} · Print ${p.edition?.size ?? ""} · ${copyNumbersLabel(p)}`, size: 14, gap: 24 },
      { text: `Certificate ${p.certificateNo}`, size: 12 },
      { text: `Pigment ink on cotton paper, signed and numbered by hand.`, gap: 18 },
      { text: `Printed and signed on ${day(p.printedAt!)}.` },
      { text: "Lucas", gap: 40, size: 14 },
    ];
    downloadFile(`certificate-${p.certificateNo}.pdf`, textPdf(lines), PDF);
  }
  audit({ action: "print.certificate_pdf", target: `order:${o.number}`, summary: `${staff.fullName} downloaded the certificate of #${o.number}` });
}

/**
 * "Invoice PDF": numbered after the order (F-GS-1424: orders are numbered in payment order, without
 * gaps), with the seller's legal mentions and the VAT of the regime in force (to confirm with the
 * accountant: numbering, mentions).
 */
export async function downloadInvoice(number: string): Promise<void> {
  const staff = requireStaff("support");
  const o = await load(number);
  const lines = invoiceLines(o, vatRegime());
  downloadFile(`invoice-F-${o.number}.pdf`, textPdf(lines), PDF);
  audit({ action: "order.invoice", target: `order:${o.number}`, summary: `${staff.fullName} downloaded invoice F-${o.number}` });
}
