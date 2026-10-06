/**
 * The one door to every vendor (docs/admin-v2/03): `adapter("boxtal").createLabel(…)`. It picks the mock
 * or the live implementation by mode, refuses clearly when the integration is off, and `call()` writes
 * an integration log line for every call (ok or error). No page and no `@/lib/api` read calls a vendor.
 */
import { adminNow, insertRow } from "@/lib/client/admin";
import { boxtalLive } from "./boxtal/live";
import { boxtalMock } from "./boxtal/mock";
import type { BoxtalAdapter } from "./boxtal/types";
import { claudeLive } from "./claude/live";
import { claudeMock } from "./claude/mock";
import type { ClaudeAdapter } from "./claude/types";
import { IntegrationNotConfigured } from "./errors";
import { getMode } from "./mode";
import { integration } from "./registry";
import { resendLive } from "./resend/live";
import { resendMock } from "./resend/mock";
import type { ResendAdapter } from "./resend/types";
import { stripeLive } from "./stripe/live";
import { stripeMock } from "./stripe/mock";
import type { StripeAdapter } from "./stripe/types";

export { IntegrationNotConfigured } from "./errors";
export { INTEGRATIONS, INTEGRATION_ROWS, PAYMENT_ROWS, integration, type Integration, type IntegrationCategory } from "./registry";
export { API_BASE, getMode, liveBlockedReason, modeCounts, statusOf, type IntegrationMode, type IntegrationStatus } from "./mode";
export { integrationLogs, outbox, type IntegrationLog, type OutboxEmail } from "./log";

interface Adapters {
  "stripe-payments": StripeAdapter;
  boxtal: BoxtalAdapter;
  resend: ResendAdapter;
  claude: ClaudeAdapter;
}

const MOCK: Adapters = { "stripe-payments": stripeMock, boxtal: boxtalMock, resend: resendMock, claude: claudeMock };
const LIVE: Adapters = { "stripe-payments": stripeLive, boxtal: boxtalLive, resend: resendLive, claude: claudeLive };

export function adapter<K extends keyof Adapters>(id: K): Adapters[K] {
  const mode = getMode(id);
  if (mode === "off") throw new IntegrationNotConfigured(id, `${integration(id)?.name ?? id} is off in Settings › Integrations`);
  return mode === "live" ? LIVE[id] : MOCK[id];
}

/** Runs one adapter call and logs it (time, integration, direction, operation, mode, ok/error, related row). */
export async function call<K extends keyof Adapters, T>(id: K, operation: string, related: string | null, fn: (a: Adapters[K]) => Promise<T>): Promise<T> {
  const mode = getMode(id) === "live" ? "live" : "mock";
  try {
    const result = await fn(adapter(id));
    insertRow("integration_logs", { at: adminNow(), integration: id, direction: "out", operation, mode, ok: true, related, detail: null });
    return result;
  } catch (e) {
    insertRow("integration_logs", { at: adminNow(), integration: id, direction: "out", operation, mode, ok: false, related, detail: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
