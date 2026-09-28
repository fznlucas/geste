/** Limited print editions and numbered copies. */
import { asset } from "@/lib/asset";
import { customers } from "@/data/customers";
import { printCopies, printEditions } from "@/data/editions";
import { orders } from "@/data/orders";
import type { PrintEditionRow } from "@/data/types";
import { works } from "@/data/works";
import { clone } from "./clone";
import type { FulfilmentStatus, PrintCopy, PrintEdition } from "./types";

function mapEdition(row: PrintEditionRow): PrintEdition {
  const work = works.find((w) => w.id === row.workId)!;
  const left = Math.max(0, row.editionSize - row.soldCount - row.reservedCount);
  return {
    id: row.id,
    workId: work.id,
    workNumber: work.number,
    workSlug: work.slug,
    imageUrl: asset(work.previewPath),
    size: row.size,
    editionSize: row.editionSize,
    priceCents: row.priceCents,
    open: row.open,
    sold: row.soldCount,
    reserved: row.reservedCount,
    left,
    soldOut: left === 0,
    nextNumber: left === 0 ? null : row.soldCount + row.reservedCount + 1,
  };
}

/** Store default: open editions only. `workId` narrows to one work's sizes. */
export async function getEditions(query: { workId?: string; includeClosed?: boolean } = {}): Promise<PrintEdition[]> {
  return clone(
    printEditions
      .filter((e) => query.includeClosed || e.open)
      .filter((e) => !query.workId || e.workId === query.workId)
      .map(mapEdition),
  );
}

export async function getEdition(id: string): Promise<PrintEdition | null> {
  const row = printEditions.find((e) => e.id === id);
  return row ? clone(mapEdition(row)) : null;
}

/** Numbered copies sold (fulfilment board, certificate log). */
export async function getPrintCopies(query: { fulfilment?: FulfilmentStatus | FulfilmentStatus[] } = {}): Promise<PrintCopy[]> {
  const wanted = query.fulfilment === undefined ? null : ([] as FulfilmentStatus[]).concat(query.fulfilment);
  return clone(
    printCopies
      .filter((c) => !wanted || wanted.includes(c.fulfilment))
      .map((c) => {
        const edition = printEditions.find((e) => e.id === c.editionId)!;
        const work = works.find((w) => w.id === edition.workId)!;
        const order = orders.find((o) => o.items.some((i) => i.id === c.orderItemId));
        const customer = order ? customers.find((p) => p.id === order.userId) : undefined;
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
          orderNumber: order?.number ?? null,
          customerName: customer?.fullName ?? null,
          city: order?.shippingAddress?.city ?? null,
        };
      }),
  );
}
