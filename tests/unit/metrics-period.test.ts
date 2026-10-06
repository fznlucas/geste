import { describe, expect, it } from "vitest";
import { calendarMonth, daysOf, inPeriod, periodDays, periodLabel, previousPeriod, rollingDays } from "@/lib/metrics/period";
import { inOrderTab, orderTab } from "@/lib/metrics/orders";

describe("periods", () => {
  it("rolling windows end today (Paris) and include it", () => {
    expect(rollingDays(30)).toEqual({ from: "2026-09-03", to: "2026-10-02" });
    expect(rollingDays(7, "2026-10-05")).toEqual({ from: "2026-09-29", to: "2026-10-05" });
    expect(periodDays(rollingDays(90))).toBe(90);
  });

  it("compares with the previous period of the same length", () => {
    expect(previousPeriod({ from: "2026-09-06", to: "2026-10-05" })).toEqual({ from: "2026-08-07", to: "2026-09-05" });
  });

  it("knows calendar months", () => {
    expect(calendarMonth("2026-09-14")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(calendarMonth("2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(daysOf(calendarMonth("2026-02-01"))).toHaveLength(28);
  });

  it("puts an instant in its Paris day", () => {
    const p = { from: "2026-10-02", to: "2026-10-02" };
    expect(inPeriod("2026-10-01T22:30:00Z", p)).toBe(true);
    expect(inPeriod("2026-10-01T21:30:00Z", p)).toBe(false);
  });

  it("labels periods, with the year only when it is not the current one", () => {
    expect(periodLabel({ from: "2026-09-06", to: "2026-10-05" })).toBe("Sep 6 – Oct 5");
    expect(periodLabel({ from: "2026-12-20", to: "2027-01-02" }, "2027-01-02")).toBe("Dec 20, 2026 – Jan 2");
  });
});

describe("order tabs", () => {
  it("one tab per status, and 'all' holds everything", () => {
    expect(orderTab({ displayStatus: "Packed" })).toBe("to_ship");
    expect(orderTab({ displayStatus: "Refund asked" })).toBe("issues");
    expect(orderTab({ displayStatus: "Delivered" })).toBe("done");
    expect(inOrderTab({ displayStatus: "Pending" }, "all")).toBe(true);
    expect(inOrderTab({ displayStatus: "Pending" }, "done")).toBe(false);
  });
});
