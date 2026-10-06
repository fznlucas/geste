/** Catalog (docs/admin-v2/05 "Catalog and guides"): one checklist, scheduled works by the clock, the hero picker. */
import { afterEach, describe, expect, it, vi } from "vitest";

async function at(iso: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SIM_NOW", iso);
  return { works: await import("@/lib/api/works"), content: await import("@/lib/api/content"), local: await import("@/lib/api/local") };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("work checklist", () => {
  it("shows the fixtures' real state: N°06 and N°09 not painted, no real result photos yet", async () => {
    const { works, local } = await at("2026-10-02T12:00:00Z");
    for (const w of local.allWorks()) {
      const missing = works.workMissing(w.id);
      expect(missing, w.number).toContain("Real result photo missing");
      expect(missing.includes("Not painted by the studio"), w.number).toBe(w.number === "N°06" || w.number === "N°09");
      expect(works.workChecklist(w.id).find((c) => c.key === "guide")?.done, w.number).toBe(true);
    }
  });

  it("the editor and the catalog read the same checklist", async () => {
    const { works } = await at("2026-10-02T12:00:00Z");
    const list = await works.getAdminWorks();
    for (const w of list.slice(0, 5)) {
      const detail = (await works.getAdminWork(w.slug))!;
      expect(detail.checklist.filter((c) => !c.done).map((c) => c.label)).toEqual(w.missing);
    }
  });

  it("a scheduled work past its time stays scheduled while the checklist fails", async () => {
    const { works } = await at("2026-10-02T12:00:00Z");
    expect(works.workStatusNow({ id: "00000000-0000-0000-0000-000000000003", status: "scheduled", publishAt: "2026-10-01T08:00:00Z" })).toBe("scheduled");
    expect(works.workStatusNow({ id: "00000000-0000-0000-0000-000000000003", status: "scheduled", publishAt: "2026-10-09T08:00:00Z" })).toBe("scheduled");
    expect(works.workStatusNow({ id: "00000000-0000-0000-0000-000000000003", status: "live", publishAt: null })).toBe("live");
  });
});

describe("hero picker", () => {
  it("offers works that pass the checklist (the result photo aside) and keeps the current hero, flagged", async () => {
    const { content } = await at("2026-10-02T12:00:00Z");
    const s = await content.getHomeSettings();
    const current = s.options.find((o) => o.slug === s.heroWork)!;
    expect(current).toBeDefined();
    expect(current.ready).toBe(false);
    expect(current.missing).toEqual(["Not painted by the studio"]);
    expect(s.options.filter((o) => o.slug !== s.heroWork).every((o) => o.ready)).toBe(true);
    expect(s.options.some((o) => o.slug === "n09")).toBe(false);
    expect(s.options.some((o) => o.slug === "n10")).toBe(true);
  });
});
