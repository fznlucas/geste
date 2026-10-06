/**
 * Integration logs and the Outbox (docs/admin-v2/03 §1, §2). Rows written in this browser by the
 * adapters (admin overlay inserts "integration_logs" and "outbox"), plus the recent inbound events the
 * simulation stands for (payments, scans, deliveries), derived, never stored.
 */
import { allOrders, allShipments, inserted } from "@/lib/api/local";

export interface IntegrationLog {
  id: string;
  at: string;
  integration: string;
  direction: "in" | "out";
  operation: string;
  mode: "mock" | "live";
  ok: boolean;
  /** "order:order-s00012", "thread:…" */
  related: string | null;
  detail: string | null;
}

export interface OutboxEmail {
  id: string;
  at: string;
  to: string;
  from: string;
  subject: string;
  /** "receipt", "library_access", "shipping", "gift_card", "support_reply", "newsletter_test", "invite", "login_link", "supplier_reorder"… */
  template: string;
  /** The rendered message, plain text. */
  body: string;
  related: string | null;
  mode: "mock" | "live";
}

/** Recent inbound events of the simulation, as the vendors would have sent them. */
function simulatedInbound(): IntegrationLog[] {
  const out: IntegrationLog[] = [];
  for (const o of allOrders().filter((x) => x.origin === "sim").slice(-40)) {
    out.push({ id: `sim-pi-${o.id}`, at: o.paidAt, integration: "stripe-payments", direction: "in", operation: "payment_intent.succeeded", mode: "mock", ok: true, related: `order:${o.id}`, detail: null });
  }
  for (const s of allShipments().filter((x) => x.inTransitAt).slice(-30)) {
    out.push({ id: `sim-trk-${s.id}`, at: s.inTransitAt!, integration: "boxtal", direction: "in", operation: "tracking.in_transit", mode: "mock", ok: true, related: `order:${s.orderId}`, detail: s.trackingNo });
    if (s.deliveredAt) out.push({ id: `sim-dlv-${s.id}`, at: s.deliveredAt, integration: "boxtal", direction: "in", operation: "tracking.delivered", mode: "mock", ok: true, related: `order:${s.orderId}`, detail: s.trackingNo });
  }
  return out;
}

/** Logs, newest first; `integration` narrows to one. */
export function integrationLogs(integration?: string, limit = 200): IntegrationLog[] {
  const all = [...inserted<IntegrationLog>("integration_logs"), ...simulatedInbound()];
  return all
    .filter((l) => !integration || l.integration === integration)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);
}

/** Every email the app "sent" in this browser, newest first. */
export function outbox(): OutboxEmail[] {
  return inserted<OutboxEmail>("outbox").slice().sort((a, b) => (a.at < b.at ? 1 : -1));
}
