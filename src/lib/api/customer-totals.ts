/**
 * A customer's totals, the same everywhere (docs/admin-v2/05 "Orders and customers"): customer list,
 * customer header, order detail ("3rd order"). Paid orders only (pending and cancelled left out), money
 * net of refunds; an order refunded in full no longer counts.
 */
import { ordersOfCustomer, refundsOfOrder } from "./local";

export interface CustomerTotals {
  ordersCount: number;
  spentCents: number;
  lastOrderAt: string | null;
}

/** `upTo`: only the orders placed at or before that instant (the order detail's "3rd order"). */
export function customerTotals(customerId: string, upTo?: string): CustomerTotals {
  let ordersCount = 0, spentCents = 0;
  let lastOrderAt: string | null = null;
  for (const o of ordersOfCustomer(customerId)) {
    if (o.status === "pending" || o.status === "cancelled" || !o.paidAt) continue;
    if (upTo && o.createdAt > upTo) continue;
    const net = o.totalCents - refundsOfOrder(o.id).reduce((s, r) => s + r.amountCents, 0);
    if (net <= 0) continue;
    ordersCount++;
    spentCents += net;
    if (!lastOrderAt || o.createdAt > lastOrderAt) lastOrderAt = o.createdAt;
  }
  return { ordersCount, spentCents, lastOrderAt };
}
