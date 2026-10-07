/**
 * What waits for a person (docs/admin-v2/05 "Badges, tabs and alerts"): sidebar counts, the dashboard's
 * "To do today" and the alerts, from the same rows as their modules. Admin v2 Phase 1 keeps today's
 * rules and numbers; Phase 5 makes badge = tab = phone = to-do and gives alerts stable ids from their cause.
 */
import { allAiCandidates } from "@/lib/api/ai";
import { clone } from "@/lib/api/clone";
import { getEditions, getPrintCopies } from "@/lib/api/editions";
import { allCampaigns, patched } from "@/lib/api/local";
import { overdueSchedules } from "@/lib/api/works";
import { homeHero } from "@/lib/api/content";
import { storeSetting } from "@/lib/api/settings";
import { getOrders } from "@/lib/api/orders";
import { getReviews } from "@/lib/api/reviews";
import { getSupportThreads } from "@/lib/api/support";
import type { StaffRole } from "@/lib/api/types";
import { parisDay, parisHour, simNow, simNowIso, simToday } from "@/lib/clock";
import { euThresholdCrossings } from "@/lib/api/vat";
import { formatPrice } from "@/lib/format";
import { books } from "@/lib/ledger";
import { metric } from "./define";
import { orderTab } from "./orders";

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
    orders: orders.filter((o) => orderTab(o) === "to_ship").length,
    fulfilment: copies.length,
    editions: editions.filter(isLowStock).length,
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
  /** Shown in the desktop popover (the phone's "New order" is phone only). */
  desktop: boolean;
  read: boolean;
}

/** Low stock, the same rule everywhere (badge, to-do, alerts, Editions page): open, 1 to 5 copies left. */
export const isLowStock = (e: { open: boolean; left: number }) => e.open && e.left > 0 && e.left <= 5;

/** The open edition closest to selling out, if 5 copies or fewer are left ("N°08 L edition: 4 left"). */
export const lowEdition = metric("The open edition with the fewest copies left, when 1 to 5 are left.", async function lowEdition(): Promise<{ id: string; label: string; left: number } | null> {
  const low = (await getEditions()).filter(isLowStock).sort((a, b) => a.left - b.left)[0];
  return low ? { id: low.id, label: `${low.workNumber} ${low.size} edition: ${low.left} left`, left: low.left } : null;
});

/** The year's EU sales to consumers passed €10,000: the buyer's country VAT (OSS) applies since. */
function euVatAlert(): Array<Omit<AdminAlert, "read">> {
  const year = simToday().slice(0, 4);
  const at = euThresholdCrossings().get(year);
  if (!at) return [];
  return [{
    id: `eu-oss:${year}`, text: `EU sales passed €10,000: buyer's country VAT (OSS) since ${parisDay(at).slice(5).replace("-", "/")} · register for OSS`,
    when: alertWhen(at), href: "/admin/finance/?tab=taxes", roles: ["owner"], phone: null, desktop: true,
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
    desktop: true,
  }];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "09:12" today, "yesterday", "Mon" this week, "Sep 21" before (Paris time). */
export function alertWhen(iso: string): string {
  const today = simToday(), day = parisDay(iso);
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  if (days <= 0) return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  if (days === 1) return "yesterday";
  if (days < 7) return WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]!;
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
}

const newest = <T,>(rows: T[], at: (r: T) => string | null | undefined): T | undefined =>
  rows.reduce<T | undefined>((m, r) => ((at(r) ?? "") > (m ? at(m) ?? "" : "") ? r : m), undefined);

/**
 * Top bar "Alerts · 6" (AdminDashboard) and AdminMAlerts. Derived from the state, never at 0. Each id
 * is built from its cause (the newest row behind it), so a new cause raises a new unread alert and
 * marking one read never marks another. Times come from those rows. Read: `patchRow("alerts", id, { read })`.
 */
export const alerts = metric("Alerts derived from the state of the store; ids from their cause, read state kept per alert.", async function alerts(): Promise<AdminAlert[]> {
  const [toPrint, orders, low, threads, reviews] = await Promise.all([
    getPrintCopies({ fulfilment: "to_print" }),
    getOrders(),
    lowEdition(),
    getSupportThreads({ status: "open", unread: true }),
    getReviews({ status: "pending" }),
  ]);
  const candidates = allAiCandidates().filter((c) => c.status === "pending");
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const paid = orders.filter((o) => o.paidAt && o.status !== "pending" && o.status !== "cancelled");
  const lastOrder = newest(paid, (o) => o.paidAt);
  const lastCopy = newest(toPrint, (c) => c.orderPaidAt);
  const lastThread = newest(threads, (t) => t.lastCustomerMessage?.at ?? t.createdAt);
  const lastReview = newest(reviews, (r) => r.createdAt);
  const lastCandidate = newest(candidates, (c) => c.createdAt);
  const short = (name: string | null) => {
    const [first, last] = (name ?? "").split(" ");
    return last ? `${first} ${last[0]}.` : first || "A customer";
  };
  const raw: Array<Omit<AdminAlert, "read">> = [
    ...(lastCopy ? [{
      id: `to-print:${lastCopy.id}`, text: `${plural(toPrint.length, "print", "prints")} to ship today`, when: alertWhen(lastCopy.orderPaidAt ?? simNowIso()),
      href: "/admin/fulfilment", roles: ["owner", "fulfilment"] as StaffRole[], phone: null, desktop: true,
    }] : []),
    ...(lastOrder ? [{
      id: `order:${lastOrder.id}`, text: `New order #${lastOrder.number} · $${Math.round(lastOrder.totalCents / 100)}`, when: alertWhen(lastOrder.paidAt),
      href: `/admin/orders/detail?number=${lastOrder.number}`, roles: ["owner", "support", "fulfilment"] as StaffRole[],
      phone: { rank: 1, text: `New order #${lastOrder.number} · $${Math.round(lastOrder.totalCents / 100)}`, href: `/admin/orders/detail?number=${lastOrder.number}` }, desktop: false,
    }] : []),
    ...(low ? [{ id: `low-edition:${low.id}:${low.left}`, text: low.label, when: alertWhen(simNowIso()), href: "/admin/editions", roles: ["owner", "fulfilment"] as StaffRole[], phone: { rank: 3, text: low.label, href: "/admin/editions" }, desktop: true }] : []),
    ...(lastThread ? [{
      id: `support:${lastThread.id}:${lastThread.lastCustomerMessage?.at ?? lastThread.createdAt}`, text: plural(threads.length, "new support message", "new support messages"),
      when: alertWhen(lastThread.lastCustomerMessage?.at ?? lastThread.createdAt), href: "/admin/support", roles: ["owner", "support"] as StaffRole[],
      phone: { rank: 2, text: `${short(lastThread.customerName)}: “${lastThread.subject}”`, href: `/admin/support?thread=${lastThread.id}` }, desktop: true,
    }] : []),
    ...(lastReview ? [{
      id: `reviews:${lastReview.id}`, text: `${plural(reviews.length, "review", "reviews")} waiting`, when: alertWhen(lastReview.createdAt), href: "/admin/reviews",
      roles: ["owner", "support", "content"] as StaffRole[], phone: { rank: 4, text: `${plural(reviews.length, "review", "reviews")} waiting`, href: "/admin/reviews" }, desktop: true,
    }] : []),
    ...(lastCandidate ? [{
      id: `ai:${lastCandidate.id}`, text: `${plural(candidates.length, "AI candidate", "AI candidates")} to validate`, when: alertWhen(lastCandidate.createdAt), href: "/admin/ai",
      roles: ["owner", "content"] as StaffRole[], phone: null, desktop: true,
    }] : []),
    // The home hero must stay live and painted by the studio.
    ...(() => {
      const h = homeHero();
      return h && h.missing.length
        ? [{ id: `hero:${h.slug}:${h.missing.join("|")}`, text: `Home hero ${h.number}: ${h.missing.join(", ").toLowerCase()} · choose another`, when: alertWhen(simNowIso()), href: "/admin/content", roles: ["owner", "content"] as StaffRole[], phone: null, desktop: true }]
        : [];
    })(),
    ...overdueSchedules().map((w) => ({
      id: `schedule:${w.id}:${w.publishAt}`, text: `${w.number} could not go live: ${w.missing.join(", ").toLowerCase()}`, when: alertWhen(w.publishAt),
      href: w.href, roles: ["owner", "content"] as StaffRole[], phone: null, desktop: true,
    })),
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
  /** AdminMToday: its wording and link (null: desktop only). */
  phone: { text: string; href: string } | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Settings › Store "Carrier pickup" ("Colissimo · 16:00"): who collects the parcels, and when. */
export function pickup(): { carrier: string; time: string } | null {
  const [carrier, time] = storeSetting("store.pickup").split("·").map((x) => x.trim());
  return carrier && time && /^\d{1,2}:\d{2}$/.test(time) ? { carrier, time } : null;
}

/** "next pickup by Colissimo today 16:00": today until the pickup time (Paris), then the next weekday. */
export function nextPickupLabel(): string | null {
  const p = pickup();
  if (!p) return null;
  const now = simNow();
  const [h, m] = p.time.split(":").map(Number) as [number, number];
  const minutes = parisHour(now) * 60 + Number(new Intl.DateTimeFormat("en-GB", { minute: "2-digit", timeZone: "Europe/Paris" }).format(now));
  const weekday = new Date(`${simToday()}T12:00:00Z`).getUTCDay();
  const day = minutes < h * 60 + m && weekday !== 0 && weekday !== 6 ? "today" : weekday === 5 || weekday === 6 ? "Monday" : "tomorrow";
  return `next pickup by ${p.carrier} ${day} ${p.time}`;
}

/**
 * "To do today" (AdminDashboard) and the phone's "To do" (AdminMToday): one line per module with
 * something waiting, never at 0, from `todoCounts` (the sidebar badges).
 */
export const todoItems = metric("One line per module with something waiting today, for the roles that can act on it.", async function todoItems(): Promise<TodoItem[]> {
  const [counts, low] = await Promise.all([todoCounts(), lowEdition()]);
  const draft = allCampaigns().filter((c) => !c.sentAt && !c.scheduledAt).sort((a, b) => b.id.localeCompare(a.id))[0];
  const due = pickup()?.time;
  const list: Array<TodoItem | null> = [
    counts.fulfilment ? {
      key: "ship", text: `${plural(counts.fulfilment, "print", "prints")} to pack and ship`, issue: true, href: "/admin/fulfilment", roles: ["owner", "fulfilment"],
      phone: { text: `${plural(counts.fulfilment, "print", "prints")} to ship${due ? ` before ${due}` : ""}`, href: "/admin/orders/" },
    } : null,
    counts.support ? { key: "support", text: plural(counts.support, "support message", "support messages"), issue: false, href: "/admin/support", roles: ["owner", "support"], phone: { text: plural(counts.support, "support message", "support messages"), href: "/admin/alerts/" } } : null,
    counts.reviews ? { key: "reviews", text: `${plural(counts.reviews, "review", "reviews")} to moderate`, issue: false, href: "/admin/reviews", roles: ["owner", "support", "content"], phone: { text: `${plural(counts.reviews, "review", "reviews")} to moderate`, href: "/admin/alerts/" } } : null,
    counts.ai ? { key: "ai", text: `${plural(counts.ai, "AI work", "AI works")} to validate`, issue: false, href: "/admin/ai", roles: ["owner", "content"], phone: null } : null,
    low ? { key: "edition", text: low.label, issue: true, href: "/admin/editions", roles: ["owner", "fulfilment"], phone: null } : null,
    draft ? { key: "newsletter", text: `${draft.month ?? "Next"} newsletter draft`, issue: false, href: "/admin/marketing", roles: ["owner"], phone: null } : null,
  ];
  return list.filter((t): t is TodoItem => t !== null);
});
