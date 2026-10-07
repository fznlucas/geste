/**
 * Values the tests expect, read through the app's own functions at the e2e clock (docs/admin-v2/01 §2):
 * order numbers, copy numbers, KPIs. A test never hard-codes a number the simulation computes; it asks
 * here, so it checks the same behaviour whatever the generated history holds.
 */
import "./sim-env";
import { getEdition, getOrder, nextOrderNumber as apiNextOrderNumber } from "@/lib/api";
import { orderNumberOf } from "@/lib/api/local";
import { formatPrice } from "@/lib/format";

/** "GS-1438" for "order-2041". */
export function orderNumber(id: string): string {
  const n = orderNumberOf(id);
  if (!n) throw new Error(`No order ${id} at the e2e clock`);
  return n;
}

/** The number the next order paid in a fresh browser gets ("GS-1454"). */
export function nextOrderNumber(): string {
  return apiNextOrderNumber();
}

/** The number after `n` ("GS-1455" after "GS-1454"). */
export const plusOrders = (number: string, k: number) => `GS-${Number(number.slice(3)) + k}`;

/** The copy number the next buyer of an edition gets in a fresh browser (12 in "12/100"). */
export async function nextCopyNumber(editionId: string): Promise<number> {
  const e = await getEdition(editionId);
  if (!e?.nextNumber) throw new Error(`${editionId} is sold out at the e2e clock`);
  return e.nextNumber;
}

/** Copies left in an edition ("89 of 100 left"). */
export async function copiesLeft(editionId: string): Promise<number> {
  return (await getEdition(editionId))!.left;
}

/** The copy numbers of an order's print line and its certificate ("C-07-S-013"). */
export async function orderCopy(orderId: string, itemIndex = 0): Promise<{ numbers: number[]; certificateNo: string | null; editionSize: number }> {
  const o = await getOrder(orderNumber(orderId));
  const prints = o!.items.filter((i) => i.kind === "print");
  const item = prints[itemIndex]!;
  return { numbers: item.copyNumbers, certificateNo: item.certificateNo, editionSize: item.edition!.editionSize };
}

export { formatPrice };

export { alerts, analytics, dashboard, orderTab, ordersThisMonth, todoCounts, todoItems } from "@/lib/metrics";
export { getCustomers, getOrders, getSocialWeek } from "@/lib/api";

/** A string as a literal piece of a RegExp. */
export const re = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "3 prints", "1 print" (the admin's plural rule). */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export { getAiPipeline, getSupportThreads } from "@/lib/api";
export { getReviews } from "@/lib/api";
export { finance, financePeriodSlug } from "@/lib/metrics";

/** EUR as the admin's books show it ("€3,438.58"). */
export const eur = (cents: number) => formatPrice(cents, "en", "EUR");

/** What an order adds to the store turnover in the books (EUR excl. VAT), e.g. one paid in this browser. */
export async function storeTurnoverOf(order: import("@/data/types").OrderRow, country = "FR"): Promise<number> {
  const { ledgerFromOrder } = await import("@/lib/ledger/derive");
  const { STORE_ACCOUNTS } = await import("@/lib/ledger");
  return ledgerFromOrder(order, undefined, country, "collect").filter((l) => STORE_ACCOUNTS.includes(l.account)).reduce((s, l) => s + l.amountEurCents, 0);
}
