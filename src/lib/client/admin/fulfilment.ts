"use client";

/**
 * Fulfilment actions (future `src/actions/admin/fulfilment.ts`): move a numbered copy on the board,
 * close or reopen an edition. Fulfilment role (the owner passes). Each writes the audit log.
 */
import { getEdition, getOrder, getPrintCopies, type FulfilmentStatus, type OrderDetail } from "@/lib/api";
import { adminNow, patchRow, requireStaff } from "../admin";
import { requireShippable, shipCopies, unship } from "./orders";

/** The four columns of AdminFulfilment, in order. */
export const FULFILMENT_STEPS: Array<{ key: FulfilmentStatus; title: string }> = [
  { key: "to_print", title: "To print" },
  { key: "printed", title: "Printed & signed" },
  { key: "packed", title: "Packed" },
  { key: "shipped", title: "Shipped" },
];

/** The copy's road, one step at a time (docs/admin-v2/05 "Fulfilment — a real state machine"). */
const ROAD: FulfilmentStatus[] = ["to_print", "printed", "packed", "shipped", "delivered"];

/**
 * `moveCopy(copyId, status)`: one step forward or back. "Printed & signed" stamps the print date (the
 * certificate is signed with the print); back to "To print" clears it. Forward to "Shipped" ships the
 * whole order (`shipCopies`: the parcel leaves with every print, a label is bought if none). Back from
 * "Shipped" only before the carrier's first scan: every print of the order returns to Packed and the
 * shipment loses its shipped stamp. Refunded or unpaid orders do not move.
 */
export async function moveCopy(copyId: string, to: FulfilmentStatus): Promise<void> {
  const staff = requireStaff("fulfilment");
  const copy = (await getPrintCopies()).find((c) => c.id === copyId);
  if (!copy) throw new Error("This print is no longer on the board.");
  if (copy.fulfilment === to) return;
  const from = ROAD.indexOf(copy.fulfilment), next = ROAD.indexOf(to);
  if (from < 0 || next < 0 || Math.abs(next - from) !== 1) throw new Error(`One step at a time: this print is ${stepTitle(copy.fulfilment)}.`);
  if (to === "delivered") throw new Error("Delivered comes from the carrier's tracking.");
  if (copy.fulfilment === "delivered") throw new Error("This print was delivered.");
  if (copy.orderNumber) await requireShippable(copy.orderNumber);
  if (to === "shipped" && copy.orderNumber) {
    await shipCopies([copyId]);
    return;
  }
  if (copy.fulfilment === "shipped" && copy.orderNumber) return unship(copy.orderNumber);
  const printedAt = to === "to_print" ? null : (copy.printedAt ?? adminNow());
  const what = `${copy.workNumber} ${copy.size} ${copy.label}${copy.orderNumber ? ` (#${copy.orderNumber})` : ""}`;
  patchRow("print_copies", copyId, { fulfilment: to, printedAt }, {
    action: "print_copy.move",
    target: `print_copy:${copyId}`,
    summary: `${staff.fullName} moved ${what} to ${stepTitle(to)}`,
  });
}

const stepTitle = (s: FulfilmentStatus) => FULFILMENT_STEPS.find((x) => x.key === s)?.title.toLowerCase() ?? s.replace("_", " ");

/**
 * The next step of an order's prints, for the one button of the phone list and the order detail:
 * "Mark printed & signed" → "Mark packed" → "Mark as shipped". Null once shipped (or nothing to ship).
 */
export function nextPrintStep(order: Pick<OrderDetail, "items" | "shipment">): "printed" | "packed" | "shipped" | null {
  const stages = order.items.filter((i) => i.kind === "print" && i.fulfilment !== "returned").map((i) => i.fulfilment);
  if (!stages.length || order.shipment?.shippedAt) return null;
  if (stages.includes("to_print")) return "printed";
  if (stages.includes("printed")) return "packed";
  if (stages.every((s) => s === "packed")) return "shipped";
  return null;
}

/** The button of each step (phone list, order detail). */
export const NEXT_STEP_LABEL = { printed: "Mark printed & signed", packed: "Mark packed", shipped: "Mark as shipped" } as const;

/** Moves every print of the order one step forward (to print → printed & signed → packed). */
export async function advancePrints(number: string): Promise<void> {
  const order = await getOrder(number);
  if (!order) throw new Error(`Order ${number} not found`);
  const step = nextPrintStep(order);
  if (step === "shipped" || step === null) throw new Error(step ? "Packed: mark it as shipped." : "Nothing left to prepare.");
  const from: FulfilmentStatus = step === "printed" ? "to_print" : "printed";
  for (const item of order.items.filter((i) => i.kind === "print" && i.fulfilment === from)) {
    for (const id of item.copyIds) await moveCopy(id, step);
  }
}

/**
 * "Raise size" (AdminEditions): more copies in the edition, numbered after the last; a sold-out
 * edition reopens with them. Never below the copies taken and their numbers.
 */
export async function setEditionSize(editionId: string, size: number): Promise<void> {
  const staff = requireStaff("fulfilment");
  const edition = await getEdition(editionId);
  if (!edition) throw new Error("Unknown edition.");
  if (!Number.isInteger(size) || size <= edition.editionSize) throw new Error(`Enter more than ${edition.editionSize} copies.`);
  patchRow("print_editions", editionId, { editionSize: size, open: true }, {
    action: "edition.size",
    target: `print_edition:${editionId}`,
    summary: `${staff.fullName} raised the ${edition.workNumber} ${edition.size} edition from ${edition.editionSize} to ${size} copies${edition.soldOut ? " (reopened)" : ""}`,
  });
}

/** Close edition / Reopen (AdminEditions). A closed edition is hidden from the store (its size disappears). */
export async function setEditionOpen(editionId: string, open: boolean): Promise<void> {
  const staff = requireStaff("fulfilment");
  const edition = await getEdition(editionId);
  if (!edition) throw new Error("Unknown edition.");
  // A sold-out edition closes itself; it reopens only with more copies (`setEditionSize`).
  if (open && edition.soldOut) throw new Error(`${edition.workNumber} ${edition.size} is sold out: raise the edition size to reopen it.`);
  // Copies held in a checkout that has not paid yet: closing would sell them anyway.
  if (!open && edition.reserved > 0) throw new Error(`${edition.reserved} ${edition.reserved === 1 ? "copy is" : "copies are"} held in a checkout: close the ${edition.workNumber} ${edition.size} edition once ${edition.reserved === 1 ? "it is" : "they are"} paid or released.`);
  if (!edition.closedByHand === open) return;
  patchRow("print_editions", editionId, { open }, {
    action: open ? "edition.reopen" : "edition.close",
    target: `print_edition:${editionId}`,
    summary: `${staff.fullName} ${open ? "reopened" : "closed"} the ${edition.workNumber} ${edition.size} edition`,
  });
}
