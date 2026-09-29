/**
 * Admin shell data: sidebar counts (`v_todo_counts` later) and the alerts list (top bar popover,
 * AdminMAlerts). Each count is computed from the same rows as its module, so they always agree.
 */
import { clone } from "./clone";
import { getEditions, getPrintCopies } from "./editions";
import { inserted, patched } from "./local";
import { getOrders } from "./orders";
import { getReviews } from "./reviews";
import { getSupportThreads } from "./support";
import type { StaffRole } from "./types";

/** Mock: AI candidates waiting for a decision (AdminAIPipeline). Replaced by a count of `ai_candidates`. */
let aiToReview: () => number = () => 5;
/** Called by the AI module so the badge follows approvals and rejections. */
export function setAiToReviewSource(get: () => number) {
  aiToReview = get;
}

export interface AdminCounts {
  /** Orders with a print still to ship ("Orders 3"). */
  orders: number;
  /** Copies in "To print" ("Fulfilment 3"). */
  fulfilment: number;
  /** Open editions with 1–5 copies left ("Print editions 1"). */
  editions: number;
  ai: number;
  /** Open threads not opened by staff since the customer wrote ("Support inbox 2"). */
  support: number;
  reviews: number;
}

export async function getAdminCounts(): Promise<AdminCounts> {
  const [orders, copies, editions, threads, reviews] = await Promise.all([
    getOrders(),
    getPrintCopies({ fulfilment: "to_print" }),
    getEditions(),
    getSupportThreads({ status: "open", unread: true }),
    getReviews({ status: "pending" }),
  ]);
  return {
    orders: orders.filter((o) => o.displayStatus === "To ship").length,
    fulfilment: copies.length,
    editions: editions.filter((e) => e.left > 0 && e.left <= 5).length,
    ai: aiToReview(),
    support: threads.length,
    reviews: reviews.length,
  };
}

export interface AdminAlert {
  id: string;
  /** "3 prints to ship today" */
  text: string;
  /** "09:12", "yesterday", "Mon" */
  when: string;
  href: string;
  /** Who sees it (docs/admin.md roles). */
  roles: StaffRole[];
  /** AdminMAlerts: its own wording and order (null: not on the phone). */
  phone: { rank: number; text: string; href: string } | null;
  read: boolean;
}

/** The open edition closest to selling out, if 5 copies or fewer are left ("N°08 L edition: 4 left"). */
export async function getLowEdition(): Promise<{ label: string; left: number } | null> {
  const low = (await getEditions()).filter((e) => e.left > 0 && e.left <= 5).sort((a, b) => a.left - b.left)[0];
  return low ? { label: `${low.workNumber} ${low.size} edition: ${low.left} left`, left: low.left } : null;
}

/**
 * Top bar "Alerts · 6" (AdminDashboard) and AdminMAlerts, newest first. Counts come from the modules;
 * the times are the mock's feed (notifications table later). Read state: `patchRow("alerts", id, { read })`.
 */
export async function getAdminAlerts(): Promise<AdminAlert[]> {
  const c = await getAdminCounts();
  const [newest] = await getOrders();
  const low = await getLowEdition();
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const raw: Array<Omit<AdminAlert, "read">> = [
    {
      id: "alert-ship", text: `${plural(c.fulfilment, "print", "prints")} to ship today`, when: "09:12", href: "/admin/fulfilment", roles: ["owner", "fulfilment"],
      phone: newest ? { rank: 1, text: `New order #${newest.number} · $${Math.round(newest.totalCents / 100)}`, href: `/admin/orders/detail?number=${newest.number}` } : null,
    },
    ...(low ? [{ id: "alert-edition", text: low.label, when: "08:40", href: "/admin/editions", roles: ["owner", "fulfilment"] as StaffRole[], phone: { rank: 3, text: low.label, href: "/admin/editions" } }] : []),
    { id: "alert-support", text: plural(c.support, "new support message", "new support messages"), when: "08:02", href: "/admin/support", roles: ["owner", "support"], phone: { rank: 2, text: "Sarah C.: “When will my print ship?”", href: "/admin/support" } },
    { id: "alert-reviews", text: `${plural(c.reviews, "review", "reviews")} waiting`, when: "yesterday", href: "/admin/reviews", roles: ["owner", "support", "content"], phone: { rank: 4, text: `${plural(c.reviews, "review", "reviews")} waiting`, href: "/admin/reviews" } },
    { id: "alert-ai", text: `${plural(c.ai, "AI candidate", "AI candidates")} to validate`, when: "yesterday", href: "/admin/ai", roles: ["owner", "content"], phone: null },
    { id: "alert-payout", text: "Payout of $1,668 sent", when: "Mon", href: "/admin/finance", roles: ["owner"], phone: { rank: 5, text: "Payout of $1,668 scheduled", href: "/admin/finance" } },
  ];
  return clone(raw.map((a) => ({ ...a, read: patched("alerts", { id: a.id, read: false }).read })));
}

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
