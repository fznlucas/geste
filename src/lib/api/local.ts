/**
 * Mock phase: rows created in this browser, merged by the read functions with the mock tables.
 *
 * 1. Purchases (`src/lib/client/purchases.ts`, "geste.purchases.v1"): what a mock checkout writes
 *    (order, numbered copies, entitlements). The Library, Orders, cart stock and the admin see them.
 * 2. Admin overlay (`src/lib/client/admin.ts`, "geste.admin.v1"): what the admin mutations write,
 *    as patches keyed by table and row id, plus inserted rows (refunds, shipments, notes, audit log…).
 *
 * The client registers the getters; on the server render (build) there is nothing local. Deleted with
 * both stores when Supabase arrives (docs/mock-plan.md §5).
 */
import { customers } from "@/data/customers";
import { printCopies, printEditions } from "@/data/editions";
import { entitlements } from "@/data/entitlements";
import { orders, refunds, shipments } from "@/data/orders";
import { reviews } from "@/data/reviews";
import { supportThreads } from "@/data/support";
import type { EntitlementRow, OrderRow, PrintCopyRow } from "@/data/types";
import { works } from "@/data/works";

export interface LocalRows {
  orders: OrderRow[];
  entitlements: EntitlementRow[];
  copies: PrintCopyRow[];
}

/** Table name (as in the migration) → row id → changed columns (camelCase). */
export type OverlayPatches = Record<string, Record<string, Record<string, unknown>>>;
/** Table name → rows created in this browser, newest first. Every row has an `id`. */
export type OverlayInserts = Record<string, Array<Record<string, unknown> & { id: string }>>;

export interface AdminOverlay {
  patches: OverlayPatches;
  inserts: OverlayInserts;
}

const NONE: LocalRows = { orders: [], entitlements: [], copies: [] };
const NO_OVERLAY: AdminOverlay = { patches: {}, inserts: {} };
let source: () => LocalRows = () => NONE;
let overlaySource: () => AdminOverlay = () => NO_OVERLAY;

/** Called once by `src/lib/client/purchases.ts`. */
export function setLocalRowsSource(get: () => LocalRows) {
  source = get;
}

/** Called once by `src/lib/client/admin.ts`. */
export function setAdminOverlaySource(get: () => AdminOverlay) {
  overlaySource = get;
}

function local(): LocalRows {
  return typeof window === "undefined" ? NONE : source();
}

function overlay(): AdminOverlay {
  return typeof window === "undefined" ? NO_OVERLAY : overlaySource();
}

/** One row with the admin's changes applied. */
export function patched<T extends { id: string }>(table: string, row: T): T {
  const p = overlay().patches[table]?.[row.id];
  return p ? { ...row, ...p } : row;
}

/** Rows inserted by the admin in this browser (newest first), typed by the caller. */
export function inserted<T>(table: string): T[] {
  return (overlay().inserts[table] ?? []) as T[];
}

/** Base rows + rows inserted in this browser, each with its patches. */
export function merged<T extends { id: string }>(table: string, base: T[]): T[] {
  return [...inserted<T>(table), ...base].map((r) => patched(table, r));
}

export const allOrders = (): OrderRow[] =>
  merged("orders", [...local().orders, ...orders]).map((o) => ({ ...o, items: o.items.map((i) => patched("order_items", i)) }));
export const allEntitlements = (): EntitlementRow[] => merged("entitlements", [...local().entitlements, ...entitlements]);
export const allPrintCopies = (): PrintCopyRow[] => merged("print_copies", [...local().copies, ...printCopies]);
export const allPrintEditions = () => merged("print_editions", printEditions);
export const allRefunds = () => merged("refunds", refunds);
export const allShipments = () => merged("shipments", shipments);
export const allReviews = () => merged("reviews", reviews);
export const allSupportThreads = () => merged("support_threads", supportThreads);
export const allCustomers = () => merged("profiles", customers);
/** Admin view of the works (status, copy). The store pages are built at deploy time and ignore it. */
export const allWorks = () => merged("works", works);

/** Copies of an edition bought in this browser (not in the mock sold count). */
export const localSoldCount = (editionId: string): number => local().copies.filter((c) => c.editionId === editionId).length;
