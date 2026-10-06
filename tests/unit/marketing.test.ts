/** Marketing (docs/admin-v2/05 "Marketing"): audiences from subscriber rows; the newsletter at 9:00 Paris. */
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe.each(["2026-10-02T12:00:00Z", "2027-01-12T12:00:00Z"])("marketing at %s", (iso) => {
  it("audiences: all = buyers + never bought, from the subscriber rows", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SIM_NOW", iso);
    const { audiences } = await import("@/lib/api/marketing");
    const local = await import("@/lib/api/local");
    const a = Object.fromEntries(audiences().map((x) => [x.key, x.count]));
    const active = local.allSubscribers().filter((s) => s.subscribedAt <= iso && (!s.unsubscribedAt || s.unsubscribedAt > iso)).length;
    expect(a.all).toBe(active);
    expect(a.buyers! + a.never_bought!).toBe(a.all);
    expect(a.buyers).toBeGreaterThan(0);
    expect(a.never_bought).toBeGreaterThan(0);
  });

  it("Tuesday 9:00 in Paris is 07:00 UTC in summer, 08:00 in winter", async () => {
    vi.resetModules();
    const { startOfDayParis } = await import("@/lib/clock");
    const nine = (day: string) => new Date(startOfDayParis(day).getTime() + 9 * 3_600_000).toISOString();
    expect(nine("2026-10-06")).toBe("2026-10-06T07:00:00.000Z");
    expect(nine("2027-01-12")).toBe("2027-01-12T08:00:00.000Z");
  });
});
