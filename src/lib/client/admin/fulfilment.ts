"use client";

/**
 * Fulfilment actions (future `src/actions/admin/fulfilment.ts`): move a numbered copy on the board,
 * close or reopen an edition. Fulfilment role (the owner passes). Each writes the audit log.
 */
import { getEdition, getOrder, getPrintCopies, getSupplies, printLab, storeSetting, supplier, type FulfilmentStatus, type OrderDetail, type SupplyKey, type SupplyOrderRow } from "@/lib/api";
import { sendEmail } from "./email";
import { getMode } from "@/lib/integrations";
import { adminDateTime } from "@/lib/dates";
import { PRINT_PAPERS } from "@/data/editions";
import { formatPrice } from "@/lib/format";
import { adminNow, insertRow, patchRow, requireStaff } from "../admin";
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
  // Back to To print: it is to print again (at the studio, or sent to the lab again).
  patchRow("print_copies", copyId, { fulfilment: to, printedAt, ...(to === "to_print" ? { sentToLabAt: null } : {}) }, {
    action: "print_copy.move",
    target: `print_copy:${copyId}`,
    summary: `${staff.fullName} moved ${what} to ${stepTitle(to)}`,
  });
}

/**
 * "Send to lab" (To print, lab mode = external, docs/admin-v2/04 Fulfilment): the print files go to the
 * lab (Print lab integration, logged); the copy waits in To print, "At the lab", and comes back printed
 * after the lab's turnaround (`labReadyAt`). Fulfilment role. Returns when it is back.
 */
export async function sendToLab(copyId: string): Promise<string> {
  const staff = requireStaff("fulfilment");
  const lab = printLab();
  if (lab.mode !== "external") throw new Error("Printing is in-house: choose an external lab in Settings › Shipping first.");
  const mode = getMode("print-lab");
  if (mode === "off") throw new Error("The print lab is off in Settings › Integrations.");
  const copy = (await getPrintCopies()).find((c) => c.id === copyId);
  if (!copy) throw new Error("This print is no longer on the board.");
  if (copy.fulfilment !== "to_print") throw new Error(`This print is ${stepTitle(copy.fulfilment)}: nothing to send.`);
  if (copy.sentToLabAt) throw new Error(`Already at the lab since ${adminDateTime(copy.sentToLabAt)}.`);
  if (copy.orderNumber) await requireShippable(copy.orderNumber);
  const at = adminNow();
  const what = `${copy.workNumber} ${copy.size} ${copy.label}${copy.orderNumber ? ` (#${copy.orderNumber})` : ""}`;
  insertRow("integration_logs", { at, integration: "print-lab", direction: "out", operation: "send print file", mode: mode === "live" ? "live" : "mock", ok: true, related: copy.orderNumber ? `order:${copy.orderNumber}` : `print_copy:${copyId}`, detail: `${what} · certificate ${copy.certificateNo}` });
  patchRow("print_copies", copyId, { sentToLabAt: at }, {
    action: "print_copy.send_to_lab",
    target: `print_copy:${copyId}`,
    summary: `${staff.fullName} sent ${what} to ${lab.name}`,
  });
  return (await getPrintCopies()).find((c) => c.id === copyId)?.labReadyAt ?? at;
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

/**
 * Editions › Edit (the one place an edition's settings change; the work editor shows a summary): price,
 * edition size (never below the copies taken and held, nor a number already given) and paper. More
 * copies reopen a sold-out edition. Owner and Fulfilment; Content reads it.
 */
export async function saveEdition(editionId: string, changes: { priceCents: number; editionSize: number; paper: string }): Promise<string[]> {
  const staff = requireStaff("fulfilment");
  const edition = await getEdition(editionId);
  if (!edition) throw new Error("Unknown edition.");
  if (!Number.isFinite(changes.priceCents) || changes.priceCents <= 0) throw new Error("Enter a price.");
  if (!Number.isInteger(changes.editionSize) || changes.editionSize < edition.minSize) throw new Error(`Enter at least ${edition.minSize} copies: ${edition.sold} taken${edition.reserved ? `, ${edition.reserved} held` : ""}${edition.minSize > edition.sold + edition.reserved ? `, number ${edition.minSize} already given` : ""}.`);
  if (!PRINT_PAPERS.includes(changes.paper as (typeof PRINT_PAPERS)[number])) throw new Error("Choose a paper.");
  const done: string[] = [];
  if (changes.priceCents !== edition.priceCents) done.push(`price ${formatPrice(edition.priceCents)} → ${formatPrice(changes.priceCents)}`);
  if (changes.editionSize !== edition.editionSize) done.push(`edition ${edition.editionSize} → ${changes.editionSize}`);
  if (changes.paper !== edition.paper) done.push(`paper ${changes.paper}`);
  if (!done.length) return [];
  const reopens = edition.soldOut && changes.editionSize > edition.editionSize;
  patchRow("print_editions", editionId, { priceCents: changes.priceCents, editionSize: changes.editionSize, paper: changes.paper, ...(reopens ? { open: true } : {}) }, {
    action: "edition.edit",
    target: `print_edition:${editionId}`,
    summary: `${staff.fullName} edited the ${edition.workNumber} ${edition.size} edition · ${done.join(", ")}${reopens ? " (reopened)" : ""}`,
  });
  return done;
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

/**
 * Supplies › Reorder: an email to the supplier (Outbox), the order kept (it arrives after the supplier's
 * delay and adds to the stock), paid from the bank (books: bank → supplies in stock). Fulfilment role.
 */
export async function reorderSupply(item: SupplyKey, quantity: number): Promise<SupplyOrderRow> {
  const staff = requireStaff("fulfilment");
  const s = (await getSupplies()).find((x) => x.key === item);
  if (!s) throw new Error("Unknown supply.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10 * s.reorderQty) throw new Error(`Order between 1 and ${10 * s.reorderQty} ${s.label.toLowerCase()}.`);
  if (s.onOrder) throw new Error(`${s.onOrder} ${s.label.toLowerCase()} already on their way (${adminDateTime(s.arrivesAt!)}).`);
  if (getMode("supplies") === "off") throw new Error("The supplier is off in Settings › Integrations.");
  const at = adminNow();
  const arrivesAt = new Date(Date.parse(at) + s.leadDays * 86_400_000).toISOString().slice(0, 19) + "Z";
  const cents = quantity * s.unitCents;
  const who = supplier();
  const row = insertRow<Omit<SupplyOrderRow, "id">>("supply_orders", { item, quantity, cents, at, arrivesAt }, {
    action: "supplies.reorder",
    target: `supply:${item}`,
    summary: `${staff.fullName} reordered ${quantity} ${s.label.toLowerCase()} from ${who.name} · €${(cents / 100).toFixed(2)}`,
  });
  insertRow("integration_logs", { at, integration: "supplies", direction: "out", operation: "reorder", mode: getMode("supplies") === "live" ? "live" : "mock", ok: true, related: `supply_order:${row.id}`, detail: `${quantity} ${s.label.toLowerCase()}` });
  await sendEmail("supplier_reorder", who.email, `supply_order:${row.id}`, {
    subject: `${quantity} ${s.label.toLowerCase()}`,
    body: `Hello,\n\nPlease send ${quantity} ${s.label.toLowerCase()} (${(s.unitCents / 100).toFixed(2)} € each excl. VAT, ${(cents / 100).toFixed(2)} € in all) to ${storeSetting("store.name")}.\n\nThank you,\n${staff.fullName}`,
  });
  return row as SupplyOrderRow;
}
