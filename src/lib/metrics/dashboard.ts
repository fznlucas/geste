/**
 * Dashboard metrics (AdminDashboard, AdminMToday), computed from the rows (fixtures + simulated + this
 * browser) by the sales functions: rolling windows ending today (today partial), compared with the
 * previous window of the same length, and today against the same weekday last week.
 * Later: `v_daily_revenue`, PostHog and the affiliate stats, cached 5 min.
 */
import { asset } from "@/lib/asset";
import type { Orientation } from "@/lib/pricing";
import { addDays, parisDay, simNow, simToday } from "@/lib/clock";
import { clone } from "@/lib/api/clone";
import { allCampaigns, allSocialPosts, allTraffic, allWorks } from "@/lib/api/local";
import { metric } from "./define";
import { dayLabel, previousPeriod, rollingDays, type Period } from "./period";
import {
  affiliateEarnedEurCents, averageOrderCents, conversionPct, dailySales, eurToUsdCents, guidesFinishedPct, guidesSoldByWork, paidOrders, storeReceiptsCents,
} from "./sales";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Sep 22": the admin boards' short date (three-letter month). */
export const adminDay = (iso: string) => `${MONTHS[new Date(iso).getUTCMonth()]} ${new Date(iso).getUTCDate()}`;

/** "+38%", "−2%" (true minus), "+0.6 pt" */
const signed = (v: number, unit = "%") => `${v < 0 ? "−" : "+"}${Math.abs(v)}${unit === "%" ? "%" : ` ${unit}`}`;
const pctChange = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : 0);

export interface DashboardDay {
  day: string;
  /** "Sep 22" */
  label: string;
  revenueCents: number;
  orders: number;
}

export interface DashboardTopWork {
  slug: string;
  number: string;
  imageUrl: string;
  orientation: Orientation;
  guides: number;
}

export interface Dashboard {
  last30d: {
    revenueCents: number;
    /** "+38% vs Aug" */
    revenueDelta: string;
    orders: number;
    ordersDelta: string;
    avgOrderCents: number;
    avgOrderDelta: string;
    conversionPct: number;
    conversionDelta: string;
    guidesFinishedPct: number;
    affiliateCents: number;
  };
  /** Daily revenue, oldest first, up to the last full month (90 days: Jul 3 → Sep 30). */
  days: DashboardDay[];
  /** "Revenue per day, September" */
  monthName: string;
  notes: Array<{ day: string; label: string; text: string }>;
  today: {
    /** "Oct 2" */
    label: string;
    revenueCents: number;
    /** "+22% vs Tue" */
    revenueDelta: string;
    orders: number;
    guides: number;
    prints: number;
    visitors: number;
    phonePct: number;
    conversionPct: number;
    /** "stable", "+0.4 pt" */
    conversionDelta: string;
  };
  /** Guides sold over 30 days, most first. */
  topWorks: DashboardTopWork[];
}

/** Definitions shown next to each dashboard figure (docs/admin-v2/06 §2). */
export const DASHBOARD_DEFINITIONS = {
  revenue: storeReceiptsCents.definition,
  orders: paidOrders.definition,
  avgOrder: averageOrderCents.definition,
  conversion: conversionPct.definition,
  guidesFinished: guidesFinishedPct.definition,
  affiliate: affiliateEarnedEurCents.definition,
} as const;

/** Chart notes: the social posts that drive traffic, and the newsletters. */
function notesIn(p: Period): Array<{ day: string; text: string }> {
  const posts = allSocialPosts().filter((x) => x.spike).map((x) => ({ day: parisDay(x.at), text: `TikTok “${x.title.replace(/^First canvas/, "first canvas")}” posted` }));
  const letters = allCampaigns().filter((c) => c.sentAt).map((c) => ({ day: parisDay(c.sentAt!), text: `Newsletter “${c.subject}” sent` }));
  // Newest first: the chart shows the latest note of its window.
  return [...posts, ...letters].filter((n) => n.day >= p.from && n.day <= p.to).sort((a, b) => b.day.localeCompare(a.day));
}

/** Today until now, and the same weekday last week until the same time. */
function todayFigures() {
  const now = simNow().getTime();
  const today = simToday();
  const lastWeek = addDays(today, -7);
  const todayP = { from: today, to: today };
  const lastP = { from: lastWeek, to: lastWeek };
  const orders = paidOrders(todayP);
  const before = paidOrders(lastP).filter((o) => Date.parse(o.paidAt) <= now - 7 * 86_400_000);
  const revenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const beforeCents = before.reduce((s, o) => s + o.totalCents, 0);
  const traffic = allTraffic().find((d) => d.day === today);
  const visitors = traffic?.visits ?? 0;
  const lastTraffic = allTraffic().find((d) => d.day === lastWeek);
  const conversion = visitors ? Math.round((orders.length / visitors) * 1000) / 10 : 0;
  const lastConversion = lastTraffic?.visits ? Math.round((paidOrders(lastP).length / lastTraffic.visits) * 1000) / 10 : 0;
  const delta = Math.round((conversion - lastConversion) * 10) / 10;
  const weekday = WEEKDAYS[new Date(`${lastWeek}T12:00:00Z`).getUTCDay()]!;
  return {
    label: dayLabel(today),
    revenueCents,
    revenueDelta: `${signed(pctChange(revenueCents, beforeCents))} vs ${weekday} ${dayLabel(lastWeek)}`,
    orders: orders.length,
    guides: orders.flatMap((o) => o.items).filter((i) => i.kind === "guide").length,
    prints: orders.flatMap((o) => o.items).filter((i) => i.kind === "print").reduce((s, i) => s + i.quantity, 0),
    visitors,
    phonePct: visitors ? Math.round(((traffic?.visitsByDevice.phone ?? 0) / visitors) * 100) : 0,
    conversionPct: conversion,
    conversionDelta: delta === 0 ? "stable" : signed(delta, "pt"),
  };
}

/** Dashboard and phone Today, in one read: `range` days ending today (today partial). */
export const dashboard = metric("Dashboard figures: revenue, orders, average order, conversion, guides finished, affiliate, revenue per day, today and top works.", async function dashboard(range = 30): Promise<Dashboard> {
  const period = rollingDays(range);
  const previous = previousPeriod(period);
  // "vs prior 30 d": one line in the tile, as drawn; the exact dates go in the tile's tooltip (06 §2).
  const vs = `vs prior ${range} d`;

  const revenueCents = storeReceiptsCents(period);
  const orders = paidOrders(period).length;
  const avgOrderCents = averageOrderCents(period);
  const conversion = conversionPct(period);
  const conversionBefore = conversionPct(previous);
  const chart = rollingDays(90);
  const days = dailySales(chart);
  const sold = guidesSoldByWork(period);
  return clone({
    last30d: {
      revenueCents,
      revenueDelta: `${signed(pctChange(revenueCents, storeReceiptsCents(previous)))} ${vs}`,
      orders,
      ordersDelta: signed(pctChange(orders, paidOrders(previous).length)),
      avgOrderCents,
      avgOrderDelta: signed(pctChange(avgOrderCents, averageOrderCents(previous))),
      conversionPct: conversion,
      conversionDelta: signed(Math.round((conversion - conversionBefore) * 10) / 10, "pt"),
      guidesFinishedPct: guidesFinishedPct(),
      affiliateCents: eurToUsdCents(affiliateEarnedEurCents(period)),
    },
    days: days.map((d) => ({ ...d, label: adminDay(`${d.day}T12:00:00Z`) })),
    monthName: MONTH_NAMES[Number(period.to.slice(5, 7)) - 1]!,
    notes: notesIn(chart).map((n) => ({ ...n, label: adminDay(`${n.day}T12:00:00Z`) })),
    today: todayFigures(),
    topWorks: allWorks()
      .map((w) => ({ slug: w.slug, number: w.number, imageUrl: asset(w.previewPath), orientation: (w.orientation ?? "portrait") as Orientation, guides: sold.get(w.id) ?? 0 }))
      .sort((a, b) => b.guides - a.guides || a.number.localeCompare(b.number)),
  });
});
