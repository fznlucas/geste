/**
 * Admin shell data: push settings and order notes. Sidebar counts, alerts and the low edition are
 * computed in `@/lib/metrics/todo` (one source per number) and re-exported here with their old names.
 */
import { clone } from "./clone";
import { inserted, patched } from "./local";

export {
  todoCounts as getAdminCounts, alerts as getAdminAlerts, lowEdition as getLowEdition, setAiToReviewSource,
  type AdminCounts, type AdminAlert,
} from "@/lib/metrics/todo";

/** AdminMAlerts "Push notifications" (web push later; kept in the admin overlay in the mock). */
export const PUSH_TOPICS = [
  { id: "new_order", label: "New order" },
  { id: "print_to_ship", label: "Print to ship" },
  { id: "support_message", label: "Support message" },
  { id: "edition_low", label: "Edition almost sold out" },
] as const;

export async function getPushSettings(): Promise<Record<string, boolean>> {
  return clone(Object.fromEntries(PUSH_TOPICS.map((t) => [t.id, patched("push_settings", { id: t.id, on: true }).on])));
}

/** Internal notes on an order (AdminOrderDetail "Add an internal note…"): rows inserted in this browser. */
export interface OrderNote {
  id: string;
  orderNumber: string;
  body: string;
  staffName: string;
  at: string;
}

export async function getOrderNotes(orderNumber: string): Promise<OrderNote[]> {
  return clone(inserted<OrderNote>("order_notes").filter((n) => n.orderNumber === orderNumber));
}
