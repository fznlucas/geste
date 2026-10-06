/**
 * Sales metrics from the rows (fixtures + simulated + this browser): paid orders, store receipts,
 * visits and funnel, sources, devices, level mix, top works. One function per concept; the dashboard
 * and analytics compose them. Money here is what customers paid, USD with VAT (the store's currency);
 * Phase 3 adds the books in EUR excluding VAT.
 */
import { addDays, parisDay, simNow, simToday } from "@/lib/clock";
import type { LevelKey } from "@/lib/pricing";
import type { Device, OrderRow, Source, TrafficDayRow } from "@/data/types";
import { allEntitlements, allOrders, allTraffic, allAffiliateCommissions } from "@/lib/api/local";
import { FX } from "@/sim/config";
import { metric } from "./define";
import { calendarMonth, daysOf, inPeriod, type Period } from "./period";

/** An order that was paid (refunded ones were paid too); pending and cancelled are not. */
export const isPaid = (o: Pick<OrderRow, "status">) => o.status !== "pending" && o.status !== "cancelled";

/**
 * Paid orders whose payment falls in the period (Paris days), up to now. Simulated rows are already cut
 * at now; fixtures are cut here (when the clock is set before them); this browser's orders always count.
 */
export const paidOrders = metric("Orders paid in the period (Europe/Paris days); refunded orders count, they were paid.", function paidOrders(p: Period): OrderRow[] {
  const now = simNow().getTime();
  return allOrders().filter((o) => isPaid(o) && inPeriod(o.paidAt, p) && (o.origin === "browser" || Date.parse(o.paidAt) <= now));
});

/** What customers paid for store orders (guides, prints, gift cards, shipping), USD with VAT. */
export const storeReceiptsCents = metric("What customers paid for store orders in the period: guides, prints, gift cards and shipping (USD, VAT included).", function storeReceiptsCents(p: Period): number {
  return paidOrders(p).reduce((s, o) => s + o.totalCents, 0);
});

export const averageOrderCents = metric("Store receipts ÷ paid orders, same period.", function averageOrderCents(p: Period): number {
  const orders = paidOrders(p);
  return orders.length ? Math.round(orders.reduce((s, o) => s + o.totalCents, 0) / orders.length) : 0;
});

/** "187 this month" (AdminOrders): paid orders of the current Paris month. */
export const ordersThisMonth = metric("Paid orders in the current calendar month (Europe/Paris).", function ordersThisMonth(): number {
  return paidOrders(calendarMonth(simToday())).length;
});

// ── Traffic ───────────────────────────────────────────────────────────────────

function trafficIn(p: Period): TrafficDayRow[] {
  return allTraffic().filter((d) => d.day >= p.from && d.day <= p.to);
}

export const visits = metric("Visits in the period (Plausible).", function visits(p: Period): number {
  return trafficIn(p).reduce((s, d) => s + d.visits, 0);
});

/** Paid orders ÷ visits, in % with one decimal. */
export const conversionPct = metric("Paid orders ÷ visits, same period.", function conversionPct(p: Period): number {
  const v = visits(p);
  return v ? Math.round((paidOrders(p).length / v) * 1000) / 10 : 0;
});

export interface FunnelStep {
  label: string;
  value: number;
}

/** Visits → viewed a work → cart → checkout → paid. "Paid" is the paid orders of the period. */
export const funnel = metric("Visits, then visitors who viewed a work, added to cart, started checkout and paid, same period.", function funnel(p: Period): FunnelStep[] {
  const days = trafficIn(p);
  const sum = (k: "visits" | "viewed" | "cart" | "checkout") => days.reduce((s, d) => s + d[k], 0);
  const paid = paidOrders(p).length;
  const checkout = Math.max(paid, sum("checkout"));
  const cart = Math.max(checkout, sum("cart"));
  const viewed = Math.max(cart, sum("viewed"));
  const visitsN = Math.max(viewed, sum("visits"));
  return [
    { label: "Visits", value: visitsN },
    { label: "Viewed a work", value: viewed },
    { label: "Added to cart", value: cart },
    { label: "Started checkout", value: checkout },
    { label: "Paid", value: paid },
  ];
});

const SOURCE_LABEL: Record<Source, string> = { tiktok: "TikTok", instagram: "Instagram", direct: "Direct", google: "Google", newsletter: "Newsletter", pinterest: "Pinterest", referral: "Friend" };

/** Paid orders by the source of their visit, most first; sources with no order are left out. */
export const ordersBySource = metric("Paid orders by the source of the visit that led to them, same period.", function ordersBySource(p: Period): Array<{ label: string; orders: number }> {
  const counts = new Map<Source, number>();
  for (const o of paidOrders(p)) counts.set(o.source ?? "direct", (counts.get(o.source ?? "direct") ?? 0) + 1);
  return [...counts].map(([k, orders]) => ({ label: SOURCE_LABEL[k], orders })).sort((a, b) => b.orders - a.orders);
});

const DEVICE_LABEL: Record<Device, string> = { phone: "Phone", desktop: "Desktop", tablet: "Tablet" };

/** Share of visits by device, whole percent adding up to 100. */
export const devicesPct = metric("Share of visits by device, same period.", function devicesPct(p: Period): Array<{ label: string; pct: number }> {
  const totals: Record<Device, number> = { phone: 0, desktop: 0, tablet: 0 };
  for (const d of trafficIn(p)) for (const k of Object.keys(totals) as Device[]) totals[k] += d.visitsByDevice[k] ?? 0;
  return shares(Object.entries(totals).map(([k, v]) => [DEVICE_LABEL[k as Device], v]));
});

const LEVEL_LABEL: Record<LevelKey, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

/** Guides sold by level, whole percent adding up to 100. */
export const levelMixPct = metric("Share of guides sold by level, same period.", function levelMixPct(p: Period): Array<{ label: string; pct: number }> {
  const totals: Record<LevelKey, number> = { beginner: 0, intermediate: 0, advanced: 0 };
  for (const o of paidOrders(p)) for (const i of o.items) if (i.kind === "guide" && i.config.level) totals[i.config.level] += 1;
  return shares(Object.entries(totals).map(([k, v]) => [LEVEL_LABEL[k as LevelKey], v]));
});

/** Whole percentages that add up to exactly 100 (largest remainder). */
export function shares(entries: Array<[string, number]>): Array<{ label: string; pct: number }> {
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return entries.map(([label]) => ({ label, pct: 0 }));
  const raw = entries.map(([, v]) => (v * 100) / total);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((s, v) => s + v, 0);
  for (const i of raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]).map(([, i]) => i)) {
    if (left-- <= 0) break;
    out[i]! += 1;
  }
  return entries.map(([label], i) => ({ label, pct: out[i]! }));
}

/** Guides sold per work (work id → count), same period. */
export const guidesSoldByWork = metric("Guides sold per work in the period.", function guidesSoldByWork(p: Period): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of paidOrders(p)) for (const i of o.items) if (i.kind === "guide" && i.workId) m.set(i.workId, (m.get(i.workId) ?? 0) + 1);
  return m;
});

/** Receipts and paid orders per day, oldest first. */
export const dailySales = metric("Store receipts and paid orders per day.", function dailySales(p: Period): Array<{ day: string; revenueCents: number; orders: number }> {
  const byDay = new Map(daysOf(p).map((d) => [d, { day: d, revenueCents: 0, orders: 0 }]));
  for (const o of paidOrders(p)) {
    const row = byDay.get(parisDay(o.paidAt));
    if (!row) continue;
    row.revenueCents += o.totalCents;
    row.orders += 1;
  }
  return [...byDay.values()];
});

// ── Reader, affiliate ─────────────────────────────────────────────────────────

/** Of every guide opened so far, the share finished (whole percent). */
export const guidesFinishedPct = metric("Guides finished ÷ guides started (opened), all purchases so far.", function guidesFinishedPct(): number {
  const started = allEntitlements().filter((e) => e.openedAt && !e.revokedAt);
  const finished = started.filter((e) => e.progress.completedAt);
  return started.length ? Math.round((finished.length / started.length) * 100) : 0;
});

/** Commission earned at partners on shopping-list sales in the period (EUR cents, as partners report). */
export const affiliateEarnedEurCents = metric("Commission earned on shopping-list sales at partner stores in the period (EUR, as reported by partners; paid later).", function affiliateEarnedEurCents(p: Period): number {
  return allAffiliateCommissions().filter((c) => inPeriod(c.at, p)).reduce((s, c) => s + c.commissionCents, 0);
});

/** USD for the admin's USD figures until the books switch to EUR (Phase 3): base rate of the config. */
export const eurToUsdCents = (eurCents: number) => Math.round(eurCents / FX.eurPerUsd);

/** First-time buyers of the window who bought again within 60 days (whole percent). */
export const repeatRatePct = metric("First-time buyers whose first order is at least 60 days old and who ordered again within 60 days.", function repeatRatePct(): number {
  const cutoff = addDays(simToday(), -60);
  const first = new Map<string, OrderRow[]>();
  for (const o of allOrders()) if (isPaid(o)) first.set(o.userId, [...(first.get(o.userId) ?? []), o]);
  let buyers = 0, repeat = 0;
  for (const list of first.values()) {
    list.sort((a, b) => a.paidAt.localeCompare(b.paidAt));
    const firstPaid = list[0]!.paidAt;
    if (parisDay(firstPaid) > cutoff) continue;
    buyers++;
    if (list.length > 1 && Date.parse(list[1]!.paidAt) - Date.parse(firstPaid) <= 60 * 86_400_000) repeat++;
  }
  return buyers ? Math.round((repeat / buyers) * 100) : 0;
});
