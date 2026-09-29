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

/**
 * Home board "Limited prints": N°07, N°01 and N°08 in A3 at $45, next numbers 12/50, 4/50 and 21/50
 * (these three come first: the Home shows the first three A3 with copies left). N°12 A3 is the
 * sold-out example, on a work the Home does not show.
 */
export const printEditions: PrintEditionRow[] = [
  edition(7, "A3", 50, 11, 0),
  edition(1, "A3", 50, 3, 0),
  edition(8, "A3", 50, 20, 0),
  edition(7, "A2", 30, 12, 0),
  edition(7, "50×70", 25, 3, 0), // Print board: N°07 in the three sizes
  edition(1, "A2", 30, 9, 1),
  edition(8, "50×70", 25, 21, 0),
  // Print board "Other editions": N°05 9/50, N°02 17/50.
  edition(5, "A3", 50, 8, 0),
  edition(2, "A3", 50, 16, 0),
  edition(3, "A3", 50, 0, 0), // seed
  edition(12, "A3", 50, 50, 0), // sold out: shows the "Sold out" state
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
  // Numbered below the Home board's next numbers (AdminFulfilment shows 12/50 for GS-2041: docs/decisions.md).
  copy("ed-07-a3", 10, "item-2041-2", "to_print", null),
  copy("ed-07-a3", 11, "item-2036-1", "to_print", null),
  copy("ed-01-a3", 2, "item-2028-1", "shipped", "2026-09-30T10:30:00Z"),
  copy("ed-01-a3", 3, "item-2031-1", "to_print", null),
  copy("ed-01-a2", 9, "item-2038-2", "printed", "2026-10-01T15:10:00Z"),
  copy("ed-08-50x70", 21, "item-2033-1", "shipped", "2026-09-29T10:00:00Z"),
  copy("ed-05-a3", 2, "item-2014-1", "delivered", "2026-09-20T09:30:00Z"),
  copy("ed-02-a3", 5, "item-2029-1", "delivered", "2026-09-26T09:30:00Z"),
];
