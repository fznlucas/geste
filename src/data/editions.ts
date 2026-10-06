/**
 * Limited print editions: every work in S, M and L (AdminEditions board; N°03 S from the seed) and the numbered copies
 * attached to mock orders (AdminFulfilment board). Sold/reserved counts are stored here because
 * the mock does not create one copy row per number.
 */
import { PRINT_SIZES, PRINT_SIZE_ORDER, type PrintSize } from "@/lib/pricing";
import { workId, works } from "./works";
import type { PrintCopyRow, PrintEditionRow } from "./types";

const editionId = (n: number, size: PrintSize) => `ed-${String(n).padStart(2, "0")}-${size.toLowerCase()}`;

function edition(n: number, size: PrintSize, soldCount: number, reservedCount = 0): PrintEditionRow {
  return {
    id: editionId(n, size),
    workId: workId(n),
    size,
    editionSize: PRINT_SIZES[size].editionSize,
    priceCents: PRINT_SIZES[size].priceCents,
    open: true,
    soldCount,
    reservedCount,
  };
}

/**
 * Copies sold per edition before the mock orders. N°07, N°01 and N°08 in S come first: the Home
 * shows the first three S editions with copies left (next numbers 12/100, 4/100, 21/100). N°12 S is a
 * sold-out size; N°13 is sold out in all three (last in the /prints gallery).
 */
const SOLD: Record<number, Partial<Record<PrintSize, number | [sold: number, reserved: number]>>> = {
  7: { S: 11, M: 12, L: 3 },
  1: { S: 3, M: [9, 1], L: 2 },
  8: { S: 20, M: 6, L: 21 },
  5: { S: 8, M: 2 },
  2: { S: 16, M: 4, L: 1 },
  3: { S: 0 },
  6: { S: 5, M: 3, L: 4 },
  10: { S: 7, M: 1 },
  12: { S: 100, M: 9 },
  13: { S: 100, M: 50, L: 25 },
  15: { S: 6, M: 2, L: 1 },
};

/** The Home's three prints, in its order. */
const HOME_FIRST = [7, 1, 8];
const workNumbers = [...HOME_FIRST, ...works.map((_, i) => i + 1).filter((n) => !HOME_FIRST.includes(n))];

export const printEditions: PrintEditionRow[] = [
  // The Home's three S editions first, then every edition by work.
  ...HOME_FIRST.map((n) => edition(n, "S", SOLD[n]!.S as number)),
  ...workNumbers.flatMap((n) =>
    PRINT_SIZE_ORDER.filter((size) => !(HOME_FIRST.includes(n) && size === "S")).map((size) => {
      const v = SOLD[n]?.[size] ?? 0;
      return Array.isArray(v) ? edition(n, size, v[0], v[1]) : edition(n, size, v);
    }),
  ),
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
    certificateNo: `C-${work}-${editionId.split("-")[2]!.toUpperCase()}-${String(number).padStart(3, "0")}`,
    printedAt,
  };
}

export const printCopies: PrintCopyRow[] = [
  // Numbered below the Home board's next numbers (AdminFulfilment shows 12/50 for GS-2041: docs/decisions.md).
  copy("ed-07-s", 10, "item-2041-2", "to_print", null),
  copy("ed-07-s", 11, "item-2036-1", "to_print", null),
  copy("ed-01-s", 2, "item-2028-1", "shipped", "2026-09-30T10:30:00Z"),
  copy("ed-01-s", 3, "item-2031-1", "to_print", null),
  copy("ed-01-m", 9, "item-2038-2", "printed", "2026-10-01T15:10:00Z"),
  copy("ed-08-l", 21, "item-2033-1", "shipped", "2026-09-29T10:00:00Z"),
  copy("ed-05-s", 2, "item-2014-1", "delivered", "2026-09-20T09:30:00Z"),
  copy("ed-02-s", 5, "item-2029-1", "delivered", "2026-09-26T09:30:00Z"),
];
