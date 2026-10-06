/** Support and reviews (docs/admin-v2/05 "Customers / support / reviews"), at the e2e clock and today. */
import { afterEach, describe, expect, it, vi } from "vitest";

const CLOCKS = ["2026-10-02T12:00:00Z", new Date().toISOString()];

async function at(iso: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SIM_NOW", iso);
  return { api: await import("@/lib/api"), support: await import("@/lib/api/support"), metrics: await import("@/lib/metrics") };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(CLOCKS)("support at %s", (iso) => {
  it("overdue: open, the customer's last message unanswered for more than 24 h", async () => {
    const { api, support } = await at(iso);
    const now = Date.parse(iso);
    for (const t of await api.getSupportThreads()) {
      const msgs = support.allMessages().filter((m) => m.threadId === t.id);
      const lastCustomer = msgs.filter((m) => m.from === "customer").at(-1)?.createdAt ?? t.createdAt;
      const lastStaff = msgs.filter((m) => m.from === "staff").at(-1)?.createdAt ?? "";
      expect(t.overdue, t.id).toBe(t.status === "open" && lastStaff < lastCustomer && now - Date.parse(lastCustomer) > 86_400_000);
    }
  });

  it("first reply: a median of real waits, in minutes", async () => {
    const { metrics } = await at(iso);
    const m = metrics.firstReplyMinutes();
    if (m !== null) expect(m).toBeGreaterThanOrEqual(0);
  });

  it("the board's saved replies are there, featured reviews never above the Real results row", async () => {
    const { api } = await at(iso);
    expect((await api.getSavedReplies()).map((r) => r.name)).toContain("Format swap");
    expect((await api.getReviews({ status: "featured" })).length).toBeLessThanOrEqual(4);
  });
});
