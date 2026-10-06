/**
 * What waits for a person (docs/admin-v2/05 "Badges, tabs and alerts"): sidebar counts, the dashboard's
 * "To do today" and the alerts, from the same rows as their modules. Admin v2 Phase 1 keeps today's
 * rules and numbers; Phase 5 makes badge = tab = phone = to-do and gives alerts stable ids from their cause.
 */
import { allAiCandidates } from "@/lib/api/ai";
import { clone } from "@/lib/api/clone";
import { getEditions, getPrintCopies } from "@/lib/api/editions";
import { patched } from "@/lib/api/local";
import { getOrders } from "@/lib/api/orders";
import { getReviews } from "@/lib/api/reviews";
import { getSupportThreads } from "@/lib/api/support";
import type { StaffRole } from "@/lib/api/types";
import { parisDay, simToday } from "@/lib/clock";
import { euThresholdCrossings } from "@/lib/api/vat";
import { formatPrice } from "@/lib/format";
import { books } from "@/lib/ledger";
import { metric } from "./define";

/** @deprecated The AI badge reads the candidates (`allAiCandidates`) directly; kept so existing imports work. */
export function setAiToReviewSource(_get: () => number) {}

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

export const todoCounts = metric("Counts of what waits for a person, per module: orders, prints, editions, AI, support, reviews.", async function todoCounts(): Promise<AdminCounts> {
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
    ai: allAiCandidates().filter((c) => c.status === "pending").length,
    support: threads.length,
    reviews: reviews.length,
  };
});

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
export const lowEdition = metric("The open edition with the fewest copies left, when 1 to 5 are left.", async function lowEdition(): Promise<{ label: string; left: number } | null> {
  const low = (await getEditions()).filter((e) => e.left > 0 && e.left <= 5).sort((a, b) => a.left - b.left)[0];
  return low ? { label: `${low.workNumber} ${low.size} edition: ${low.left} left`, left: low.left } : null;
});

/**
 * Top bar "Alerts · 6" (AdminDashboard) and AdminMAlerts, newest first. Counts come from the modules;
 * the times are the mock's feed (notifications table later). Read state: `patchRow("alerts", id, { read })`.
 */
/** The year's EU sales to consumers passed €10,000: the buyer's country VAT (OSS) applies since. */
function euVatAlert(): Array<Omit<AdminAlert, "read">> {
  const year = simToday().slice(0, 4);
  const at = euThresholdCrossings().get(year);
  if (!at) return [];
  return [{
    id: `eu-oss:${year}`, text: `EU sales passed €10,000: buyer's country VAT (OSS) since ${parisDay(at).slice(5).replace("-", "/")} · register for OSS`,
    when: parisDay(at).slice(5).replace("-", "/"), href: "/admin/finance/?tab=taxes", roles: ["owner"], phone: null,
  }];
}

/** The last payout sent (desktop) and the next one (phone), from the books: never a typed amount. */
function payoutAlert(): Array<Omit<AdminAlert, "read">> {
  const payouts = books().payouts;
  const sent = payouts.find((p) => p.status !== "scheduled");
  const next = payouts.find((p) => p.status === "scheduled");
  if (!sent && !next) return [];
  const euros = (c: number) => formatPrice(c, "en", "EUR");
  const day = (iso: string) => `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(parisDay(iso).slice(5, 7)) - 1]} ${Number(parisDay(iso).slice(8, 10))}`;
  return [{
    id: `payout:${(sent ?? next)!.id}`,
    text: sent ? `Payout of ${euros(sent.amountEurCents)} ${sent.status === "paid" ? "received" : "sent"}` : `Payout of ${euros(next!.amountEurCents)} scheduled`,
    when: day((sent ?? next)!.at),
    href: "/admin/finance/?tab=cash",
    roles: ["owner"],
    phone: next ? { rank: 5, text: `Payout of ${euros(next.amountEurCents)} scheduled · ${day(next.at)}`, href: "/admin/finance/?tab=cash" } : null,
  }];
}

export const alerts = metric("Alerts derived from the state of the store, newest first; read state is kept per alert.", async function alerts(): Promise<AdminAlert[]> {
  const c = await todoCounts();
  const [newest] = await getOrders();
  const low = await lowEdition();
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
    ...payoutAlert(),
    ...euVatAlert(),
  ];
  return clone(raw.map((a) => ({ ...a, read: patched("alerts", { id: a.id, read: false }).read })));
});

export interface TodoItem {
  key: string;
  /** "3 prints to pack and ship" */
  text: string;
  issue: boolean;
  href: string;
  /** Who can act on it (docs/admin.md roles). */
  roles: StaffRole[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "To do today" (AdminDashboard): one line per module with something waiting, never at 0. */
export const todoItems = metric("One line per module with something waiting today, for the roles that can act on it.", async function todoItems(): Promise<TodoItem[]> {
  const [counts, low] = await Promise.all([todoCounts(), lowEdition()]);
  const list: Array<TodoItem | null> = [
    counts.fulfilment ? { key: "ship", text: `${plural(counts.fulfilment, "print", "prints")} to pack and ship`, issue: true, href: "/admin/fulfilment", roles: ["owner", "fulfilment"] } : null,
    counts.support ? { key: "support", text: plural(counts.support, "support message", "support messages"), issue: false, href: "/admin/support", roles: ["owner", "support"] } : null,
    counts.reviews ? { key: "reviews", text: `${plural(counts.reviews, "review", "reviews")} to moderate`, issue: false, href: "/admin/reviews", roles: ["owner", "support", "content"] } : null,
    counts.ai ? { key: "ai", text: `${plural(counts.ai, "AI work", "AI works")} to validate`, issue: false, href: "/admin/ai", roles: ["owner", "content"] } : null,
    low ? { key: "edition", text: low.label, issue: true, href: "/admin/editions", roles: ["owner", "fulfilment"] } : null,
    { key: "newsletter", text: "October newsletter draft", issue: false, href: "/admin/marketing", roles: ["owner"] },
  ];
  return list.filter((t): t is TodoItem => t !== null);
});
