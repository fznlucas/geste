/**
 * The fixtures' open items get a plan too (docs/decisions.md "Admin v2 · fixtures and the 48 h rule"):
 * prints to make and ship, parcels in transit, threads to answer, reviews and AI candidates to decide.
 * They follow the same rule as generated rows: younger than the hands-off window they stay open (that
 * is Lucas's to-do); older, "Lucas · simulated" handles them on these planned times, unless Lucas acted
 * in the admin first. Same lags as the generator; deterministic per seed.
 */
import { addDays, parisDay } from "@/lib/clock";
import type { PrintSize } from "@/lib/pricing";
import { aiCandidates } from "@/data/ai";
import { printCopies, printEditions } from "@/data/editions";
import { orders, shipments } from "@/data/orders";
import { reviews } from "@/data/reviews";
import { savedReplies, supportMessages, supportThreads } from "@/data/support";
import { customers } from "@/data/customers";
import { parisInstant, workingDayAfter } from "./calendar";
import { DELIVERY_DAYS, FULFILMENT } from "./config";
import { rngFor } from "./random";
import { copyAt, shipmentAt, threadAt } from "./materialize";
import type { PlannedCandidate, PlannedCopy, PlannedMessage, PlannedReview, PlannedShipment, PlannedThread } from "./types";

const H = 3_600_000;
const DAY = 24 * H;
const at = (iso: string, plusMs: number) => new Date(Math.round((Date.parse(iso) + plusMs) / 1000) * 1000).toISOString().slice(0, 19) + "Z";
const EU = new Set(["FR", "BE", "DE", "NL", "ES", "IT"]);
const zoneOf = (country: string): "FR" | "EU" | "INTL" => (country === "FR" ? "FR" : EU.has(country) ? "EU" : "INTL");

export interface FixturePlans {
  copies: PlannedCopy[];
  /** Existing shipments with their carrier future, and the shipments the open orders will get. */
  shipments: PlannedShipment[];
  threads: PlannedThread[];
  messages: PlannedMessage[];
  reviews: PlannedReview[];
  candidates: PlannedCandidate[];
}

/** The reply a thread gets: the saved reply of its subject, else a short thank-you. */
function replyFor(threadId: string, firstName: string): string {
  const subject = supportThreads.find((t) => t.id === threadId)?.subject ?? "";
  const saved = /refund|format/i.test(subject) ? "reply-format" : /ship|print/i.test(subject) ? "reply-eta" : /grey|mud|mixed/i.test(subject) ? "reply-mud" : null;
  const body = saved ? savedReplies.find((r) => r.id === saved)!.body : "Hi {name}, thank you for the message, it made my day. — Lucas";
  return body.replace("{name}", firstName);
}

const memo = new Map<string, FixturePlans>();

export function fixturePlans(seed: string): FixturePlans {
  const cached = memo.get(seed);
  if (cached) return cached;
  const r = (id: string) => rngFor(seed, "fixture", id);

  // ── Prints: make, pack, label, pick up, carry ──────────────────────────────
  const copies: PlannedCopy[] = [];
  const planned: PlannedShipment[] = [];
  for (const order of orders) {
    const prints = order.items.filter((i) => i.kind === "print");
    if (!prints.length) continue;
    const itemIds = new Set(prints.map((i) => i.id));
    const orderCopies = printCopies.filter((c) => c.orderItemId && itemIds.has(c.orderItemId));
    const existing = shipments.find((s) => s.orderId === order.id);
    const rng = r(order.id);
    const country = order.shippingAddress?.country ?? customers.find((c) => c.id === order.userId)?.defaultAddress.country ?? "FR";
    const [minD, maxD] = DELIVERY_DAYS[zoneOf(country)];
    if (existing) {
      if (existing.status === "delivered") continue;
      // In transit: the carrier delivers on the afternoon round (no human step left).
      const deliveryDay = workingDayAfter(parisDay(existing.shippedAt!), Math.max(minD, 2));
      const outForDeliveryAt = existing.outForDeliveryAt ?? parisInstant(deliveryDay, rng.between(14.5, 15.5));
      const deliveredAt = existing.deliveredAt ?? at(outForDeliveryAt, rng.between(1, 3) * H);
      planned.push({
        ...existing,
        plan: { paidAt: order.paidAt, labelCreatedAt: existing.labelCreatedAt ?? existing.shippedAt!, shippedAt: existing.shippedAt!, inTransitAt: existing.inTransitAt ?? existing.shippedAt!, outForDeliveryAt, deliveredAt },
      });
      for (const c of orderCopies) copies.push({ ...c, paidAt: order.paidAt, plan: { orderId: order.id, printedAt: c.printedAt ?? existing.shippedAt!, packedAt: c.printedAt ?? existing.shippedAt! } });
      continue;
    }
    // Still in the studio: printed the next working day (or as the fixture says), then packed and shipped.
    const printedAt = orderCopies.find((c) => c.printedAt)?.printedAt ?? parisInstant(workingDayAfter(parisDay(order.paidAt), 1), rng.between(FULFILMENT.printHour[0], FULFILMENT.printHour[1]));
    const packedAt = at(printedAt, rng.between(1.5, 4) * H);
    const packDay = parisDay(packedAt);
    const labelCreatedAt = at(packedAt, rng.between(5, 20) * 60_000);
    const pickupDay = Date.parse(labelCreatedAt) < Date.parse(parisInstant(packDay, FULFILMENT.pickupHour - 0.5)) ? packDay : workingDayAfter(addDays(packDay, 1), 0);
    const shippedAt = parisInstant(pickupDay, FULFILMENT.pickupHour + rng.between(0, 0.5));
    const inTransitAt = parisInstant(workingDayAfter(pickupDay, 1), rng.between(FULFILMENT.inTransitHour[0], FULFILMENT.inTransitHour[1]));
    const deliveryDay = workingDayAfter(pickupDay, rng.int(minD, maxD));
    const outForDeliveryAt = parisInstant(deliveryDay, rng.between(7, 9));
    const deliveredAt = parisInstant(deliveryDay, rng.between(10, 17));
    for (const c of orderCopies) copies.push({ ...c, paidAt: order.paidAt, plan: { orderId: order.id, printedAt, packedAt } });
    const sizes = prints.map((i) => printEditions.find((e) => e.id === i.editionId)!.size as PrintSize);
    const tube = sizes.includes("L") ? 80 : sizes.includes("M") ? 70 : 60;
    const kg = sizes.reduce((s, size) => s + (size === "L" ? 0.8 : size === "M" ? 0.6 : 0.4), 0);
    const carrier = order.shippingMethod === "mondial_relay" ? "mondial_relay" : order.shippingMethod === "chronopost_express" ? "chronopost" : "colissimo";
    const n = order.id.slice("order-".length);
    planned.push({
      id: `ship-f${n}`, orderId: order.id, carrier,
      trackingNo: carrier === "mondial_relay" ? `${n}${String(rng.int(0, 9999)).padStart(4, "0")}` : zoneOf(country) === "FR" ? `6A${n}${String(rng.int(0, 9_999_999)).padStart(7, "0")}` : `CA${n}${String(rng.int(0, 9999)).padStart(4, "0")}FR`,
      parcel: `Tube ${tube} cm · ${kg.toFixed(1)} kg`, status: "label_created",
      labelCreatedAt: null, shippedAt: null, inTransitAt: null, outForDeliveryAt: null, deliveredAt: null,
      plan: { paidAt: order.paidAt, labelCreatedAt, shippedAt, inTransitAt, outForDeliveryAt, deliveredAt },
    });
  }

  // ── Support: an answer from Lucas, then done ───────────────────────────────
  const threads: PlannedThread[] = [];
  const messages: PlannedMessage[] = supportMessages.map((m) => ({ ...m, plan: { human: false, after: null } }));
  for (const t of supportThreads) {
    if (t.status === "done") {
      threads.push({ ...t, plan: { doneAt: null, readAt: t.readAt } });
      continue;
    }
    const rng = r(t.id);
    const replyAt = at(t.createdAt, rng.between(2, 8) * H);
    const firstName = customers.find((c) => c.id === t.userId)?.fullName.split(" ")[0] ?? "there";
    messages.push({ id: `msg-f${t.id.slice("thread-".length)}-reply`, threadId: t.id, from: "staff", body: replyFor(t.id, firstName), staffName: "Lucas", createdAt: replyAt, plan: { human: true, after: null } });
    threads.push({ ...t, status: "open", plan: { doneAt: at(replyAt, rng.between(0.5, 20) * H), readAt: t.readAt ?? at(replyAt, -10 * 60_000) } });
  }

  // ── Reviews and AI candidates: decided ──────────────────────────────────────
  const plannedReviews: PlannedReview[] = reviews.map((rev) => {
    if (rev.status !== "pending") return { ...rev, plan: { status: rev.status, decidedAt: rev.createdAt } };
    const rng = r(rev.id);
    const status = rev.rating === 5 && rev.photoPath && rng.chance(0.3) ? "featured" : "published";
    return { ...rev, plan: { status, decidedAt: at(rev.createdAt, rng.between(0.5, 3) * DAY) } };
  });
  const candidates: PlannedCandidate[] = aiCandidates.map((c) => {
    if (c.status !== "pending") return { ...c, plan: { status: c.status, decidedAt: c.createdAt } };
    const rng = r(c.id);
    return { ...c, plan: { status: c.note === "Best score" ? "approved" : "rejected", decidedAt: at(c.createdAt, rng.between(0.5, 3) * DAY) } };
  });

  const plans: FixturePlans = { copies, shipments: planned, threads, messages, reviews: plannedReviews, candidates };
  memo.set(seed, plans);
  return plans;
}

export interface MaterializedFixtures {
  /** Fixture copies with their fulfilment at now (copies without a plan are not listed: keep the fixture row). */
  copies: Map<string, import("@/data/types").PrintCopyRow>;
  /** Fixture shipments at now, replacing the fixture rows by id; new ones once their label exists. */
  shipments: import("@/data/types").ShipmentRow[];
  threads: import("@/data/types").SupportThreadRow[];
  messages: import("@/data/types").SupportMessageRow[];
  reviews: import("@/data/types").ReviewRow[];
  candidates: import("@/data/types").AiCandidateRow[];
  audit: import("./materialize").SimAuditLine[];
}

/**
 * The fixtures at `now`: the same cut as generated rows. `frozen` holds, per order, thread, review or
 * candidate id that Lucas touched in the admin, the time of his first action: the plan stops there.
 */
export function materializeFixtures(plans: FixturePlans, now: number, handsOffMs: number, frozen: Map<string, number>): MaterializedFixtures {
  const clock = (id: string) => ({ now, handsOffMs, humanUntil: frozen.get(id) });
  const shipmentOf = new Map(plans.shipments.map((s) => [s.orderId, s]));
  const audit: import("./materialize").SimAuditLine[] = [];
  const copies = new Map(plans.copies.map((c) => [c.id, copyAt(c, shipmentOf.get(c.plan!.orderId), clock(c.plan!.orderId))]));
  const shipments: import("@/data/types").ShipmentRow[] = [];
  for (const s of plans.shipments) {
    const row = shipmentAt(s, clock(s.orderId));
    if (!row) continue;
    shipments.push(row);
    if (s.id.startsWith("ship-f") && row.shippedAt) audit.push({ at: row.shippedAt, action: "order.ship", target: `order:${row.orderId}`, summary: `marked the order as shipped · ${row.trackingNo}` });
  }
  const byThread = new Map<string, PlannedMessage[]>();
  for (const m of plans.messages) byThread.set(m.threadId, [...(byThread.get(m.threadId) ?? []), m]);
  const threads: import("@/data/types").SupportThreadRow[] = [];
  const messages: import("@/data/types").SupportMessageRow[] = [];
  for (const t of plans.threads) {
    const v = threadAt(t, byThread.get(t.id) ?? [], clock(t.id));
    // What the fixture already says (read, done) is a fact, not a plan: it stays.
    const fixture = supportThreads.find((x) => x.id === t.id)!;
    threads.push({ ...v.thread, status: t.plan.doneAt === null ? fixture.status : v.thread.status, readAt: fixture.readAt ?? v.thread.readAt });
    messages.push(...v.messages);
    const reply = v.messages.find((m) => m.id.endsWith("-reply"));
    if (reply) audit.push({ at: reply.createdAt, action: "support.reply", target: `thread:${t.id}`, summary: `replied to “${t.subject}”` });
  }
  const decided = <T extends { id: string; createdAt: string; status: string }>(row: T & { plan: { status: T["status"]; decidedAt: string } }) => {
    const { plan, ...rest } = row;
    const c = clock(row.id);
    const decidedMs = Date.parse(plan.decidedAt);
    const visible = decidedMs <= now && Date.parse(row.createdAt) <= now - handsOffMs && (c.humanUntil === undefined || decidedMs <= c.humanUntil);
    return { row: (visible ? { ...rest, status: plan.status } : rest) as unknown as T, changed: visible && plan.status !== row.status, at: plan.decidedAt };
  };
  const reviews = plans.reviews.map((rev) => {
    const d = decided(rev);
    if (d.changed) audit.push({ at: d.at, action: "review.moderate", target: `review:${rev.id}`, summary: `${rev.plan.status === "featured" ? "featured" : "published"} a ${rev.rating}-star review` });
    return d.row;
  });
  const candidates = plans.candidates.map((cand) => {
    const d = decided(cand);
    if (d.changed && cand.plan.status === "approved") audit.push({ at: d.at, action: "ai.approve", target: `ai_candidate:${cand.id}`, summary: "approved an AI candidate (kept for later)" });
    return d.row;
  });
  return { copies, shipments, threads, messages, reviews, candidates, audit };
}
