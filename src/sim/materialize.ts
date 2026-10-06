/**
 * From planned rows to what has happened by "now" (docs/admin-v2/01 §2, §5; PLAN.md D5, D6).
 *
 * - Customer, carrier and machine events show once their time has passed.
 * - Human events (Lucas prints, packs, ships, replies, moderates, refunds, decides) show only when
 *   their time has passed AND their subject is older than the hands-off window: what is younger stays
 *   open, it is today's to-do. Older items were handled "as Lucas would have", by "Lucas · simulated".
 * - When Lucas acted on an order in the admin, its simulated human events stop at his first action
 *   (`humanUntil`): the simulation never touches that order again.
 *
 * Rows older than `now − hands-off` never change when "now" moves on.
 */
import type { CampaignRow, GiftCardRow } from "@/data/marketing";
import type {
  AffiliateClickDayRow, AiCandidateRow, AiJobRow, EntitlementRow, PrintCopyRow, RefundRow, ReviewRow, ShipmentRow, SupportMessageRow,
  SupportThreadRow, TrafficDayRow,
} from "@/data/types";
import { parisDay, parisHour } from "@/lib/clock";
import { HOUR_WEIGHTS } from "./config";
import type { PlannedCandidate, PlannedCopy, PlannedEntitlement, PlannedJob, PlannedMessage, PlannedRefund, PlannedReview, PlannedShipment, PlannedThread, SimRows } from "./types";

export interface SimClock {
  now: number;
  handsOffMs: number;
  /** Human events of this subject stop here (Lucas acted in the admin). */
  humanUntil?: number;
}

/** An audit line written by the simulation (Settings › Security shows them as "Lucas · simulated"). */
export interface SimAuditLine {
  at: string;
  action: string;
  /** "order:<id>", "thread:<id>"… (by id: numbers are given at read time). */
  target: string;
  summary: string;
}

export interface MaterializedRows extends Omit<SimRows, "copies" | "shipments" | "entitlements" | "refunds" | "threads" | "messages" | "reviews" | "aiJobs" | "aiCandidates"> {
  copies: PrintCopyRow[];
  shipments: ShipmentRow[];
  entitlements: EntitlementRow[];
  refunds: RefundRow[];
  threads: SupportThreadRow[];
  messages: SupportMessageRow[];
  reviews: ReviewRow[];
  aiJobs: AiJobRow[];
  aiCandidates: AiCandidateRow[];
  /** Order id → its refund's resulting status (applied by the merge). */
  orderStatus: Map<string, "refunded" | "partially_refunded">;
  audit: SimAuditLine[];
  /** The instant these rows are cut at, and the hands-off window used. */
  now: number;
  handsOffMs: number;
}

const t = (iso: string | null | undefined) => (iso ? Date.parse(iso) : Number.POSITIVE_INFINITY);
const seen = (iso: string | null | undefined, c: SimClock) => t(iso) <= c.now;

/** A human event: its time has passed, its subject left the hands-off window, Lucas has not taken over. */
function human(eventAt: string | null | undefined, subjectAt: string, c: SimClock): boolean {
  const e = t(eventAt);
  return e <= c.now && t(subjectAt) <= c.now - c.handsOffMs && (c.humanUntil === undefined || e <= c.humanUntil);
}

// ── Prints ────────────────────────────────────────────────────────────────────

export function copyAt(copy: PlannedCopy, shipment: PlannedShipment | undefined, c: SimClock): PrintCopyRow {
  const { plan, ...row } = copy;
  if (!plan) return row;
  const paidAt = copy.paidAt!;
  const printed = human(plan.printedAt, paidAt, c);
  const packed = human(plan.packedAt, paidAt, c);
  const shipped = !!shipment && human(shipment.plan.shippedAt, paidAt, c);
  const delivered = shipped && seen(shipment!.plan.deliveredAt, c);
  return {
    ...row,
    fulfilment: delivered ? "delivered" : shipped ? "shipped" : packed ? "packed" : printed ? "printed" : "to_print",
    printedAt: printed ? plan.printedAt : null,
    packedAt: packed ? plan.packedAt : null,
  };
}

export function refundAt(r: PlannedRefund, c: SimClock): RefundRow | null {
  if (!human(r.createdAt, r.plan.requestedAt, c)) return null;
  const { plan: _plan, ...row } = r;
  return row;
}

export function shipmentAt(s: PlannedShipment, c: SimClock): ShipmentRow | null {
  const { plan, ...row } = s;
  if (!human(plan.labelCreatedAt, plan.paidAt, c)) return null;
  const shipped = human(plan.shippedAt, plan.paidAt, c);
  const inTransit = shipped && seen(plan.inTransitAt, c);
  const out = inTransit && seen(plan.outForDeliveryAt, c);
  const delivered = out && seen(plan.deliveredAt, c);
  return {
    ...row,
    status: delivered ? "delivered" : shipped ? "in_transit" : "label_created",
    labelCreatedAt: plan.labelCreatedAt,
    shippedAt: shipped ? plan.shippedAt : null,
    inTransitAt: inTransit ? plan.inTransitAt : null,
    outForDeliveryAt: out ? plan.outForDeliveryAt : null,
    deliveredAt: delivered ? plan.deliveredAt : null,
  };
}

// ── Library ───────────────────────────────────────────────────────────────────

export function entitlementAt(e: PlannedEntitlement, refund: RefundRow | undefined, c: SimClock): EntitlementRow {
  const { plan, ...row } = e;
  let step = row.progress.step;
  for (const [at, s] of plan.steps) if (seen(at, c)) step = s;
  const completedAt = seen(plan.completedAt, c) ? plan.completedAt! : undefined;
  return {
    ...row,
    openedAt: seen(plan.openedAt, c) ? plan.openedAt : null,
    progress: completedAt ? { step, completedAt } : { step },
    printsLeft: 3 - plan.printsAt.filter((at) => seen(at, c)).length,
    revokedAt: refund?.revokeAccess ? refund.createdAt : null,
  };
}

// ── Support ───────────────────────────────────────────────────────────────────

export function threadAt(th: PlannedThread, messages: PlannedMessage[], c: SimClock): { thread: SupportThreadRow; messages: SupportMessageRow[] } {
  const { plan, ...row } = th;
  const visible: SupportMessageRow[] = [];
  for (const m of messages) {
    const { plan: mp, ...msg } = m;
    const ok = mp.human ? human(m.createdAt, th.createdAt, c) : seen(m.createdAt, c) && (mp.after === null || human(mp.after, th.createdAt, c));
    if (ok) visible.push(msg);
  }
  const done = human(plan.doneAt, th.createdAt, c);
  return {
    thread: {
      ...row,
      status: done ? "done" : "open",
      readAt: human(plan.readAt, th.createdAt, c) ? plan.readAt : null,
      updatedAt: visible.at(-1)?.createdAt ?? row.createdAt,
    },
    messages: visible,
  };
}

// ── Today's aggregates, cut at now ────────────────────────────────────────────

const HOURS_TOTAL = HOUR_WEIGHTS.reduce((s, w) => s + w, 0);

/** Share of a day's activity already done at this instant (by the hour curve). */
export function dayFraction(now: number): number {
  const hour = parisHour(now);
  const minutes = (now - Date.parse(new Date(now).toISOString().slice(0, 14) + "00:00Z")) / 3_600_000;
  let done = 0;
  for (let h = 0; h < hour; h++) done += HOUR_WEIGHTS[h]!;
  done += HOUR_WEIGHTS[hour]! * Math.min(1, Math.max(0, minutes));
  return done / HOURS_TOTAL;
}

function trafficToday(row: TrafficDayRow, paidSoFar: number, f: number): TrafficDayRow {
  const scale = (n: number) => Math.round(n * f);
  const visits = Math.max(scale(row.visits), paidSoFar);
  const checkout = Math.min(visits, Math.max(paidSoFar, scale(row.checkout)));
  const viewed = Math.min(visits, Math.max(checkout, scale(row.viewed)));
  const cart = Math.min(viewed, Math.max(checkout, scale(row.cart)));
  const bySource = Object.fromEntries(Object.entries(row.visitsBySource).map(([k, v]) => [k, Math.round(v * f)])) as TrafficDayRow["visitsBySource"];
  const byDevice = Object.fromEntries(Object.entries(row.visitsByDevice).map(([k, v]) => [k, Math.round(v * f)])) as TrafficDayRow["visitsByDevice"];
  return { ...row, visits, viewed, cart, checkout, paid: paidSoFar, visitsBySource: bySource, visitsByDevice: byDevice };
}

// ── Everything ────────────────────────────────────────────────────────────────

export function materialize(rows: SimRows, now: number, handsOffMs: number, fixtureOrdersToday = 0): MaterializedRows {
  const c: SimClock = { now, handsOffMs };
  const today = parisDay(now);
  const audit: SimAuditLine[] = [];

  const orders = rows.orders.filter((o) => seen(o.paidAt, c));
  const shipmentsByOrder = new Map(rows.shipments.map((s) => [s.orderId, s]));
  const refunds: RefundRow[] = [];
  const refundByOrder = new Map<string, RefundRow>();
  const orderStatus = new Map<string, "refunded" | "partially_refunded">();
  for (const r of rows.refunds) {
    if (!human(r.createdAt, r.plan.requestedAt, c)) continue;
    const { plan, ...row } = r;
    refunds.push(row);
    refundByOrder.set(row.orderId, row);
    orderStatus.set(row.orderId, plan.orderStatus);
    audit.push({ at: row.createdAt, action: "order.refund", target: `order:${row.orderId}`, summary: `refunded $${(row.amountCents / 100).toFixed(2)} · ${row.reason}` });
  }

  const copies = rows.copies.filter((cp) => seen(cp.paidAt, c)).map((cp) => copyAt(cp, shipmentsByOrder.get(cp.plan?.orderId ?? ""), c));
  const shipments: ShipmentRow[] = [];
  for (const s of rows.shipments) {
    const row = shipmentAt(s, c);
    if (!row) continue;
    shipments.push(row);
    if (row.shippedAt) audit.push({ at: row.shippedAt, action: "order.ship", target: `order:${row.orderId}`, summary: `marked the order as shipped · ${row.trackingNo}` });
  }

  const orderOfItem = new Map<string, string>();
  for (const o of orders) for (const i of o.items) orderOfItem.set(i.id, o.id);
  const entitlements = rows.entitlements.filter((e) => seen(e.createdAt, c)).map((e) => {
    const orderId = orderOfItem.get(e.orderItemId);
    return entitlementAt(e, orderId ? refundByOrder.get(orderId) : undefined, c);
  });

  const giftCards: GiftCardRow[] = [];
  const redemptions = rows.redemptions.filter((r) => seen(r.at, c));
  const used = new Map<string, number>();
  for (const r of redemptions) used.set(r.giftCardId, (used.get(r.giftCardId) ?? 0) + r.cents);
  for (const g of rows.giftCards) if (seen(g.createdAt, c)) giftCards.push({ ...g, balanceCents: g.initialCents - (used.get(g.id) ?? 0) });

  const messagesByThread = new Map<string, PlannedMessage[]>();
  for (const m of rows.messages) messagesByThread.set(m.threadId, [...(messagesByThread.get(m.threadId) ?? []), m]);
  const threads: SupportThreadRow[] = [];
  const messages: SupportMessageRow[] = [];
  for (const th of rows.threads) {
    if (!seen(th.createdAt, c)) continue;
    const v = threadAt(th, messagesByThread.get(th.id) ?? [], c);
    threads.push(v.thread);
    messages.push(...v.messages);
    const reply = v.messages.find((m) => m.from === "staff");
    if (reply) audit.push({ at: reply.createdAt, action: "support.reply", target: `thread:${th.id}`, summary: `replied to “${th.subject}”` });
  }

  const reviews: ReviewRow[] = rows.reviews.filter((r) => seen(r.createdAt, c)).map((r: PlannedReview) => {
    const { plan, ...row } = r;
    if (!human(plan.decidedAt, r.createdAt, c)) return row;
    audit.push({ at: plan.decidedAt, action: "review.moderate", target: `review:${r.id}`, summary: `${plan.status === "hidden" ? "hid" : plan.status === "featured" ? "featured" : "published"} a ${r.rating}-star review` });
    return { ...row, status: plan.status };
  });

  const aiJobs: AiJobRow[] = rows.aiJobs.filter((j) => seen(j.createdAt, c)).map((j: PlannedJob) => {
    const { plan, ...row } = j;
    const start = t(j.createdAt), end = t(plan.finishesAt);
    if (now >= end) return { ...row, status: "done", progress: 100 };
    return { ...row, status: "running", progress: Math.max(3, Math.min(99, Math.round(((now - start) / (end - start)) * 100))) };
  });
  const aiCandidates: AiCandidateRow[] = rows.aiCandidates.filter((x) => seen(x.createdAt, c)).map((x: PlannedCandidate) => {
    const { plan, ...row } = x;
    if (!human(plan.decidedAt, x.createdAt, c)) return row;
    if (plan.status === "approved") audit.push({ at: plan.decidedAt, action: "ai.approve", target: `ai_candidate:${x.id}`, summary: "approved an AI candidate (kept for later)" });
    return { ...row, status: plan.status };
  });

  const ordersToday = orders.filter((o) => parisDay(o.paidAt) === today).length + fixtureOrdersToday;
  const f = dayFraction(now);
  const traffic = rows.traffic.filter((d) => d.day <= today).map((d) => (d.day === today ? trafficToday(d, ordersToday, f) : d));
  const affiliateClicks: AffiliateClickDayRow[] = rows.affiliateClicks
    .filter((d) => d.day <= today)
    .map((d) => (d.day === today ? { ...d, listOpens: Math.round(d.listOpens * f), clicks: Object.fromEntries(Object.entries(d.clicks).map(([k, v]) => [k, Math.round(v * f)])) } : d));

  const campaigns: CampaignRow[] = [];
  for (const cmp of rows.campaigns) {
    if (!seen(cmp.scheduledAt, c)) continue;
    if (seen(cmp.sentAt, c)) {
      campaigns.push(cmp);
      audit.push({ at: cmp.sentAt!, action: "campaign.send", target: `campaign:${cmp.id}`, summary: `sent “${cmp.subject}”` });
    } else campaigns.push({ ...cmp, sentAt: null, openRate: null, clickRate: null });
  }

  audit.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return {
    customers: rows.customers.filter((x) => seen(x.createdAt, c)),
    orders,
    payments: rows.payments.filter((p) => seen(p.at, c)),
    copies,
    shipments,
    entitlements,
    refunds,
    giftCards,
    redemptions,
    threads,
    messages,
    reviews,
    traffic,
    subscribers: rows.subscribers.filter((s) => seen(s.subscribedAt, c)).map((s) => (s.unsubscribedAt && !seen(s.unsubscribedAt, c) ? { ...s, unsubscribedAt: null } : s)),
    affiliateClicks,
    affiliateCommissions: rows.affiliateCommissions.filter((a) => seen(a.at, c)),
    socialPosts: rows.socialPosts.filter((p) => seen(p.at, c)),
    campaigns,
    aiJobs,
    aiCandidates,
    orderStatus,
    audit,
    now,
    handsOffMs,
  };
}
