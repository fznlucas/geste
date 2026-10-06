/**
 * Order metrics (AdminOrders, sidebar, phone). `orderTab` is the one place that says which tab an
 * order belongs to: the Orders tabs, `getOrders({ tab })` and (from Phase 5) the badges read it.
 */
import type { Order, OrderDisplayStatus, OrdersTab } from "@/lib/api/types";

export const ORDER_TABS: Record<Exclude<OrdersTab, "all">, OrderDisplayStatus[]> = {
  to_ship: ["To ship", "Printed", "Packed"],
  issues: ["Refund asked", "Pending"],
  done: ["Shipped", "Delivered", "Refunded", "Partly refunded", "Cancelled"],
};

/** The tab of an order ("to_ship", "issues", "done"). */
export function orderTab(order: Pick<Order, "displayStatus">): Exclude<OrdersTab, "all"> {
  for (const [tab, statuses] of Object.entries(ORDER_TABS) as Array<[Exclude<OrdersTab, "all">, OrderDisplayStatus[]]>) {
    if (statuses.includes(order.displayStatus)) return tab;
  }
  return "done";
}

/** Does the order show under this tab ("all" shows every order)? */
export function inOrderTab(order: Pick<Order, "displayStatus">, tab: OrdersTab): boolean {
  return tab === "all" || orderTab(order) === tab;
}

export { ordersThisMonth } from "./sales";
