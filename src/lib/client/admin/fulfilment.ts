"use client";

/**
 * Fulfilment actions (future `src/actions/admin/fulfilment.ts`): move a numbered copy on the board,
 * close or reopen an edition. Fulfilment role (the owner passes). Each writes the audit log.
 */
import { getEdition, getPrintCopies, type FulfilmentStatus } from "@/lib/api";
import { adminNow, patchRow, requireStaff } from "../admin";
import { markShipped } from "./orders";

/** The four columns of AdminFulfilment, in order. */
export const FULFILMENT_STEPS: Array<{ key: FulfilmentStatus; title: string }> = [
  { key: "to_print", title: "To print" },
  { key: "printed", title: "Printed & signed" },
  { key: "packed", title: "Packed" },
  { key: "shipped", title: "Shipped" },
];

/**
 * `moveCopy(copyId, status)`: "Printed & signed" stamps the print date (the certificate is signed with the
 * print and appears in the certificate log); back to "To print" clears it. "Shipped" is the order's
 * "Mark as shipped" (`markShipped`): the parcel leaves with every print of the order, the customer is notified.
 * Moving a card back from Shipped only moves the card (the shipment stays on the order).
 */
export async function moveCopy(copyId: string, to: FulfilmentStatus): Promise<void> {
  const staff = requireStaff("fulfilment");
  const copy = (await getPrintCopies()).find((c) => c.id === copyId);
  if (!copy) throw new Error("This print is no longer on the board.");
  if (copy.fulfilment === to) return;
  if (to === "shipped" && copy.orderNumber) return markShipped({ number: copy.orderNumber });
  const printedAt = to === "to_print" ? null : (copy.printedAt ?? adminNow());
  const title = FULFILMENT_STEPS.find((s) => s.key === to)?.title ?? to;
  const what = `${copy.workNumber} ${copy.size} ${copy.label}${copy.orderNumber ? ` (#${copy.orderNumber})` : ""}`;
  patchRow("print_copies", copyId, { fulfilment: to, printedAt }, {
    action: "print_copy.move",
    target: `print_copy:${copyId}`,
    summary: `${staff.fullName} moved ${what} to ${title}`,
  });
}

/** Close edition / Reopen (AdminEditions). A closed edition is hidden from the store (its size disappears). */
export async function setEditionOpen(editionId: string, open: boolean): Promise<void> {
  const staff = requireStaff("fulfilment");
  const edition = await getEdition(editionId);
  if (!edition) throw new Error("Unknown edition.");
  if (edition.open === open) return;
  patchRow("print_editions", editionId, { open }, {
    action: open ? "edition.reopen" : "edition.close",
    target: `print_edition:${editionId}`,
    summary: `${staff.fullName} ${open ? "reopened" : "closed"} the ${edition.workNumber} ${edition.size} edition`,
  });
}
