/**
 * Limited print editions (AdminEditions board; N°03 A3 from the seed) and the numbered copies
 * attached to mock orders (AdminFulfilment board). Sold/reserved counts are stored here because
 * the mock does not create one copy row per number.
 */
import { PRINT_PRICES, type PrintSize } from "@/lib/pricing";
import { workId } from "./works";
import type { PrintCopyRow, PrintEditionRow } from "./types";

function edition(n: number, size: PrintSize, editionSize: number, soldCount: number, reservedCount: number): PrintEditionRow {
  const slug = size === "50×70" ? "50x70" : size.toLowerCase();
  return {
    id: `ed-${String(n).padStart(2, "0")}-${slug}`,
    workId: workId(n),
    size,
    editionSize,
    priceCents: PRINT_PRICES[size],
    open: true,
    soldCount,
    reservedCount,
  };
}

export const printEditions: PrintEditionRow[] = [
  edition(7, "A3", 50, 45, 5), // sold out: shows the "Sold out" state
  edition(7, "A2", 30, 12, 0),
  edition(1, "A3", 50, 18, 1),
  edition(1, "A2", 30, 9, 1),
  edition(8, "50×70", 25, 21, 0),
  edition(5, "A3", 50, 9, 0),
  edition(2, "A3", 50, 17, 0),
  edition(3, "A3", 50, 0, 0), // seed
];

function copy(editionId: string, number: number, orderItemId: string, fulfilment: PrintCopyRow["fulfilment"], printedAt: string | null): PrintCopyRow {
  const [, work] = editionId.split("-");
  return {
    id: `copy-${editionId}-${number}`,
    editionId,
    number,
    status: "sold",
    orderItemId,
    fulfilment,
    certificateNo: `C-${work}-${String(number).padStart(3, "0")}`,
    printedAt,
  };
}

export const printCopies: PrintCopyRow[] = [
  copy("ed-07-a3", 12, "item-2041-2", "to_print", null),
  copy("ed-07-a3", 13, "item-2036-1", "to_print", null),
  copy("ed-01-a3", 4, "item-2031-1", "to_print", null),
  copy("ed-01-a2", 9, "item-2038-2", "printed", "2026-10-01T15:10:00Z"),
  copy("ed-08-50x70", 21, "item-2033-1", "shipped", "2026-09-29T10:00:00Z"),
  copy("ed-05-a3", 2, "item-2014-1", "delivered", "2026-09-20T09:30:00Z"),
  copy("ed-02-a3", 5, "item-2029-1", "delivered", "2026-09-26T09:30:00Z"),
];
