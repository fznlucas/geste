import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, clockSource, parisDay, parisHour, parisOffsetMinutes, simNow, simToday, startOfDayParis } from "@/lib/clock";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("simNow", () => {
  it("reads NEXT_PUBLIC_SIM_NOW (the e2e and unit clock)", () => {
    expect(simNow().toISOString()).toBe("2026-10-02T12:00:00.000Z");
    expect(clockSource()).toBe("build");
    expect(simToday()).toBe("2026-10-02");
  });

  it("falls back to real time when nothing is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SIM_NOW", "");
    const clock = await import("@/lib/clock");
    const before = Date.now();
    const now = clock.simNow().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
    expect(clock.clockSource()).toBe("real");
  });

  it("ignores an invalid build value", async () => {
    vi.stubEnv("NEXT_PUBLIC_SIM_NOW", "not a date");
    const clock = await import("@/lib/clock");
    expect(clock.clockSource()).toBe("real");
  });
});

describe("Europe/Paris days", () => {
  it("cuts days at Paris midnight, not UTC", () => {
    expect(parisDay("2026-10-01T21:59:59Z")).toBe("2026-10-01");
    expect(parisDay("2026-10-01T22:00:00Z")).toBe("2026-10-02");
    expect(parisDay("2026-12-31T23:30:00Z")).toBe("2027-01-01");
  });

  it("knows summer and winter time", () => {
    expect(parisOffsetMinutes("2026-07-01T12:00:00Z")).toBe(120);
    expect(parisOffsetMinutes("2026-12-01T12:00:00Z")).toBe(60);
    // Clocks go back on Sunday, Oct 25, 2026 at 03:00 (01:00 UTC).
    expect(parisOffsetMinutes("2026-10-25T00:59:59Z")).toBe(120);
    expect(parisOffsetMinutes("2026-10-25T01:00:00Z")).toBe(60);
    // Clocks go forward on Sunday, Mar 28, 2027 at 02:00 (01:00 UTC).
    expect(parisOffsetMinutes("2027-03-28T00:59:59Z")).toBe(60);
    expect(parisOffsetMinutes("2027-03-28T01:00:00Z")).toBe(120);
  });

  it("starts a day at Paris midnight, across DST changes", () => {
    expect(startOfDayParis("2026-10-02").toISOString()).toBe("2026-10-01T22:00:00.000Z");
    expect(startOfDayParis("2026-10-25").toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(startOfDayParis("2026-10-26").toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(startOfDayParis("2027-03-28").toISOString()).toBe("2027-03-27T23:00:00.000Z");
    expect(startOfDayParis("2027-03-29").toISOString()).toBe("2027-03-28T22:00:00.000Z");
    // A DST Sunday lasts 25 h in October and 23 h in March.
    expect(startOfDayParis("2026-10-26").getTime() - startOfDayParis("2026-10-25").getTime()).toBe(25 * 3_600_000);
    expect(startOfDayParis("2027-03-29").getTime() - startOfDayParis("2027-03-28").getTime()).toBe(23 * 3_600_000);
  });

  it("adds days and reads the Paris hour", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(parisHour("2026-10-02T12:00:00Z")).toBe(14);
  });
});

describe("URL override (?simNow=)", () => {
  function fakeWindow(search: string) {
    const store = new Map<string, string>();
    const sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    vi.stubGlobal("window", { location: { search }, sessionStorage });
    return store;
  }

  afterEach(() => vi.unstubAllGlobals());

  it("wins over the build value, is kept for the tab, and resets", async () => {
    const store = fakeWindow("?simNow=2027-03-15T18:00:00Z");
    const clock = await import("@/lib/clock");
    expect(clock.simNow().toISOString()).toBe("2027-03-15T18:00:00.000Z");
    expect(clock.clockSource()).toBe("url");
    expect(store.get("geste.simnow.v1")).toBe("2027-03-15T18:00:00.000Z");
    clock.setClockOverride(null);
    expect(clock.simNow().toISOString()).toBe("2026-10-02T12:00:00.000Z");
    expect(store.has("geste.simnow.v1")).toBe(false);
  });

  it("?simNow=real clears a kept override", async () => {
    const store = fakeWindow("?simNow=real");
    store.set("geste.simnow.v1", "2027-01-01T00:00:00.000Z");
    const clock = await import("@/lib/clock");
    expect(clock.clockSource()).toBe("build");
    expect(store.has("geste.simnow.v1")).toBe(false);
  });
});
