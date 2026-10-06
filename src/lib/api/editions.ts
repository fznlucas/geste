/** Limited print editions and numbered copies. */
import { asset } from "@/lib/asset";
import { imageRatio, printCm } from "@/lib/pricing";
import type { PrintEditionRow } from "@/data/types";
import { works } from "@/data/works";
import { clone } from "./clone";
import { allPrintCopies, allPrintEditions, customerById, editionSoldCount, orderOfItem } from "./local";
import type { FulfilmentStatus, PrintCopy, PrintEdition } from "./types";

function mapEdition(row: PrintEditionRow): PrintEdition {
  const work = works.find((w) => w.id === row.workId)!;
  // Counted from the copies of every source: pre-launch, fixtures, simulated, this browser (print_copies).
  const sold = editionSoldCount(row.id);
  const left = Math.max(0, row.editionSize - sold - row.reservedCount);
  return {
    id: row.id,
    workId: work.id,
    workNumber: work.number,
    workSlug: work.slug,
    imageUrl: asset(work.previewPath),
    orientation: work.orientation,
    imageRatio: imageRatio(work),
    size: row.size,
    dimensions: printCm(row.size, work.orientation),
    editionSize: row.editionSize,
    priceCents: row.priceCents,
    open: row.open,
    sold,
    reserved: row.reservedCount,
    left,
    soldOut: left === 0,
    nextNumber: left === 0 ? null : sold + row.reservedCount + 1,
  };
}

/** Store default: open editions only. `workId` narrows to one work's sizes. */
export async function getEditions(query: { workId?: string; includeClosed?: boolean } = {}): Promise<PrintEdition[]> {
  return clone(
    allPrintEditions()
      .filter((e) => query.includeClosed || e.open)
      .filter((e) => !query.workId || e.workId === query.workId)
      .map(mapEdition),
  );
}

export async function getEdition(id: string): Promise<PrintEdition | null> {
  const row = allPrintEditions().find((e) => e.id === id);
  return row ? clone(mapEdition(row)) : null;
}

/** Numbered copies sold (fulfilment board, certificate log), local checkout copies included. Newest order first. */
export async function getPrintCopies(query: { fulfilment?: FulfilmentStatus | FulfilmentStatus[] } = {}): Promise<PrintCopy[]> {
  const wanted = query.fulfilment === undefined ? null : ([] as FulfilmentStatus[]).concat(query.fulfilment);
  const editions = new Map(allPrintEditions().map((e) => [e.id, e]));
  return clone(
    allPrintCopies()
      .filter((c) => !wanted || wanted.includes(c.fulfilment))
      .map((c) => {
        const edition = editions.get(c.editionId)!;
        const work = works.find((w) => w.id === edition.workId)!;
        const order = c.orderItemId ? orderOfItem(c.orderItemId) : undefined;
        const customer = order ? customerById(order.userId) : undefined;
        return {
          id: c.id,
          editionId: c.editionId,
          number: c.number,
          label: `${c.number}/${edition.editionSize}`,
          certificateNo: c.certificateNo,
          fulfilment: c.fulfilment,
          printedAt: c.printedAt,
          workNumber: work.number,
          size: edition.size,
          imageUrl: asset(work.previewPath),
          orientation: work.orientation,
          orderNumber: order?.number ?? null,
          orderPaidAt: order?.paidAt ?? null,
          customerId: customer?.id ?? null,
          customerName: customer?.fullName ?? null,
          city: order?.shippingAddress?.city ?? null,
          workSlug: work.slug,
        };
      })
      .sort((a, b) => (b.orderPaidAt ?? "").localeCompare(a.orderPaidAt ?? "") || a.number - b.number),
  );
}

/** AdminEditions "Certificate log": a certificate is signed with the print, so printed copies only, newest first. */
export async function getCertificateLog(): Promise<PrintCopy[]> {
  const copies = await getPrintCopies();
  return copies.filter((c) => c.certificateNo && c.printedAt).sort((a, b) => b.printedAt!.localeCompare(a.printedAt!));
}
