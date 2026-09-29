/**
 * Dashboard (AdminDashboard, AdminMToday). Mock: the store aggregates of `src/data/dashboard.ts`
 * (the mock orders are already in them) plus the orders placed in this browser, which are dated from
 * the mock's today: a checkout moves "Orders", "Revenue" and "Top works" at once.
 * Later: `v_daily_revenue`, PostHog and the affiliate stats, cached 5 min.
 */
import { asset } from "@/lib/asset";
import { MOCK_NOW } from "@/data/customers";
import { chartNotes, dailyRevenue, guidesSold30d, last30d, today } from "@/data/dashboard";
import { clone } from "./clone";
import { allOrders, allWorks } from "./local";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Sep 22": the admin boards' short date (three-letter month). */
export const adminDay = (iso: string) => `${MONTHS[new Date(iso).getUTCMonth()]} ${new Date(iso).getUTCDate()}`;

/** "+38%", "−2%" (true minus), "+0.6 pt" */
const signed = (v: number, unit = "%") => `${v < 0 ? "−" : "+"}${Math.abs(v)}${unit === "%" ? "%" : ` ${unit}`}`;
const pctChange = (now: number, before: number) => Math.round(((now - before) / before) * 100);

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

export async function getDashboard(): Promise<Dashboard> {
  // Orders placed in this browser: dated from the mock's today, after every aggregate.
  const since = `${MOCK_NOW.slice(0, 10)}T00:00:00Z`;
  const fresh = allOrders().filter((o) => o.createdAt >= since && o.status !== "cancelled" && o.status !== "pending");
  const freshCents = fresh.reduce((s, o) => s + o.totalCents, 0);
  const items = fresh.flatMap((o) => o.items);

  const september = dailyRevenue.filter((d) => d.day.startsWith("2026-09"));
  const august = dailyRevenue.filter((d) => d.day.startsWith("2026-08"));
  const sum = (rows: typeof dailyRevenue, k: "revenueCents" | "orders") => rows.reduce((s, d) => s + d[k], 0);
  const revenueCents = sum(september, "revenueCents") + freshCents;
  const orders = sum(september, "orders") + fresh.length;
  const augAvg = sum(august, "revenueCents") / sum(august, "orders");
  const avgOrderCents = Math.round(revenueCents / orders);

  const guides = new Map(Object.entries(guidesSold30d));
  for (const i of items) {
    if (i.kind !== "guide" || !i.workId) continue;
    const w = allWorks().find((x) => x.id === i.workId);
    if (w) guides.set(w.slug, (guides.get(w.slug) ?? 0) + 1);
  }

  const todayRevenue = today.revenueCents + freshCents;
  const days = dailyRevenue.slice(-90);
  return clone({
    last30d: {
      revenueCents,
      revenueDelta: `${signed(pctChange(revenueCents, sum(august, "revenueCents")))} vs Aug`,
      orders,
      ordersDelta: signed(pctChange(orders, sum(august, "orders"))),
      avgOrderCents,
      avgOrderDelta: signed(pctChange(avgOrderCents, augAvg)),
      conversionPct: last30d.conversionPct,
      conversionDelta: signed(last30d.conversionDeltaPt, "pt"),
      guidesFinishedPct: last30d.guidesFinishedPct,
      affiliateCents: last30d.affiliateCents,
    },
    days: days.map((d) => ({ ...d, label: adminDay(`${d.day}T12:00:00Z`) })),
    monthName: MONTH_NAMES[new Date(`${september[0]!.day}T12:00:00Z`).getUTCMonth()]!,
    notes: chartNotes.map((n) => ({ ...n, label: adminDay(`${n.day}T12:00:00Z`) })),
    today: {
      label: adminDay(`${today.day}T12:00:00Z`),
      revenueCents: todayRevenue,
      revenueDelta: `${signed(pctChange(todayRevenue, today.compareRevenueCents))} vs ${today.compareLabel}`,
      orders: today.orders + fresh.length,
      guides: today.guides + items.filter((i) => i.kind === "guide").length,
      prints: today.prints + items.filter((i) => i.kind === "print").reduce((s, i) => s + i.quantity, 0),
      visitors: today.visitors,
      phonePct: today.phonePct,
      conversionPct: today.conversionPct,
      conversionDelta: today.conversionDeltaPt === 0 ? "stable" : signed(today.conversionDeltaPt, "pt"),
    },
    topWorks: [...guides.entries()]
      .map(([slug, n]) => {
        const w = allWorks().find((x) => x.slug === slug)!;
        return { slug, number: w.number, imageUrl: asset(w.previewPath), guides: n };
      })
      .sort((a, b) => b.guides - a.guides || a.number.localeCompare(b.number)),
  });
}
