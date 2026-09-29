/**
 * Mock phase: rows created in this browser by a mock checkout (`src/lib/client/purchases.ts`,
 * "geste.purchases.v1"). The client registers a getter; the read functions below merge these rows
 * with the mock tables, so the Library, Orders and cart stock see the purchase. On the server
 * render (build) there is nothing local. Deleted with the purchases store when Supabase arrives.
 */
import { printCopies } from "@/data/editions";
import { entitlements } from "@/data/entitlements";
import { orders } from "@/data/orders";
import type { EntitlementRow, OrderRow, PrintCopyRow } from "@/data/types";

export interface LocalRows {
  orders: OrderRow[];
  entitlements: EntitlementRow[];
  copies: PrintCopyRow[];
}

const NONE: LocalRows = { orders: [], entitlements: [], copies: [] };
let source: () => LocalRows = () => NONE;

/** Called once by `src/lib/client/purchases.ts`. */
export function setLocalRowsSource(get: () => LocalRows) {
  source = get;
}

function local(): LocalRows {
  return typeof window === "undefined" ? NONE : source();
}

export const allOrders = (): OrderRow[] => [...local().orders, ...orders];
export const allEntitlements = (): EntitlementRow[] => [...local().entitlements, ...entitlements];
export const allPrintCopies = (): PrintCopyRow[] => [...local().copies, ...printCopies];

/** Copies of an edition bought in this browser (not in the mock sold count). */
export const localSoldCount = (editionId: string): number => local().copies.filter((c) => c.editionId === editionId).length;
