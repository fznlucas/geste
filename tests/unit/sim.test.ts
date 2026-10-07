/**
 * Invariants of the simulated business (docs/admin-v2/07): determinism, the hands-off rule, orders and
 * stock, prices, funnel, calibration on the boards, performance. The clock values: Oct 2, 2026 12:00
 * (the e2e clock), today (real time) and Mar 15, 2027 18:00.
 */
import { promoCodes } from "@/data/marketing";
import { describe, expect, it } from "vitest";
import { addDays, parisDay } from "@/lib/clock";
import { priceLines } from "@/lib/api/price-lines";
import type { StoredCartLine } from "@/lib/api/types";
import { CUSTOMER_SOURCES } from "@/data/customers";
import { printEditions } from "@/data/editions";
import { orders as fixtureOrders } from "@/data/orders";
import { works } from "@/data/works";
import { HANDS_OFF_HOURS, SIM_SEED } from "@/sim/config";
import { fixturePlans, materializeFixtures } from "@/sim/fixturePlans";
import { Simulator } from "@/sim/generate";
import { materialize } from "@/sim/materialize";
import { hashString } from "@/sim/random";

const H = 3_600_000;
const CLOCKS = ["2026-10-02T12:00:00Z", new Date().toISOString(), "2027-03-15T18:00:00Z"];
const handsOff = HANDS_OFF_HOURS * H;

function simAt(iso: string, seed = SIM_SEED) {
  const s = new Simulator(seed);
  s.run(parisDay(iso));
  return s;
}

describe("determinism", () => {
  it.each(CLOCKS)("same seed and clock give the same history (%s)", (iso) => {
    const a = materialize(simAt(iso).rows, Date.parse(iso), handsOff);
    const b = materialize(simAt(iso).rows, Date.parse(iso), handsOff);
    const hash = (x: unknown) => hashString(JSON.stringify(x, (_, v) => (v instanceof Map ? [...v] : v)));
    expect(hash(a)).toBe(hash(b));
  });

  it("another seed is another history", () => {
    const a = simAt(CLOCKS[0]!).rows.orders.map((o) => o.paidAt).join();
    const b = simAt(CLOCKS[0]!, "another universe").rows.orders.map((o) => o.paidAt).join();
    expect(a).not.toBe(b);
  });

  it.each(CLOCKS)("later the same day: a superset, and nothing older than the hands-off window changes (%s)", (iso) => {
    const t1 = Date.parse(iso);
    const t2 = Math.min(t1 + 5 * H, Date.parse(`${parisDay(iso)}T21:59:00Z`));
    const sim = simAt(iso);
    const early = materialize(sim.rows, t1, handsOff);
    const late = materialize(sim.rows, t2, handsOff);
    const lateOrders = new Map(late.orders.map((o) => [o.id, o]));
    for (const o of early.orders) expect(lateOrders.get(o.id)).toEqual(o);
    const settled = t1 - handsOff;
    const lateThreads = new Map(late.threads.map((x) => [x.id, x]));
    for (const th of early.threads.filter((x) => Date.parse(x.createdAt) <= settled - 30 * 86_400_000)) expect(lateThreads.get(th.id)).toEqual(th);
    const lateCopies = new Map(late.copies.map((c) => [c.id, c]));
    for (const c of early.copies.filter((x) => Date.parse(x.paidAt!) <= settled - 30 * 86_400_000)) expect(lateCopies.get(c.id)).toEqual(c);
    expect(late.orders.length).toBeGreaterThanOrEqual(early.orders.length);
  });
});

describe("the hands-off window", () => {
  it("what is younger than 48 h and needs Lucas stays open", () => {
    const now = Date.parse(CLOCKS[0]!);
    const m = materialize(simAt(CLOCKS[0]!).rows, now, handsOff);
    const young = (iso: string) => Date.parse(iso) > now - handsOff;
    for (const c of m.copies) if (young(c.paidAt!)) expect(c.fulfilment).toBe("to_print");
    for (const r of m.reviews) if (young(r.createdAt)) expect(r.status).toBe("pending");
    for (const t of m.threads) if (young(t.createdAt)) expect(t.status).toBe("open");
    for (const c of m.aiCandidates) if (young(c.createdAt)) expect(c.status).toBe("pending");
    // And older items were handled by "Lucas · simulated".
    expect(m.audit.length).toBeGreaterThan(0);
    expect(m.copies.filter((c) => !young(c.paidAt!) && Date.parse(c.paidAt!) < now - 10 * 86_400_000).every((c) => c.fulfilment !== "to_print")).toBe(true);
  });
});

describe("orders, stock and prices", () => {
  const sim = simAt(CLOCKS[2]!);
  const m = materialize(sim.rows, Date.parse(CLOCKS[2]!), handsOff);

  it("never sells a copy that is not left", () => {
    const taken = new Map<string, number>();
    for (const e of printEditions) taken.set(e.id, e.soldCount); // pre-launch + fixture copies
    for (const c of sim.rows.copies) taken.set(c.editionId, (taken.get(c.editionId) ?? 0) + 1);
    for (const e of printEditions) expect(taken.get(e.id)! + e.reservedCount).toBeLessThanOrEqual(e.editionSize);
    // Sold-out editions sell nothing more (N°12 S and every size of N°13).
    for (const id of ["ed-12-s", "ed-13-s", "ed-13-m", "ed-13-l"]) expect(sim.rows.copies.filter((c) => c.editionId === id)).toHaveLength(0);
  });

  it("every generated order costs exactly what checkout charges (priceCart, tolerance 0)", () => {
    for (const o of m.orders) {
      const lines: StoredCartLine[] = o.items.map((i, k) =>
        i.kind === "gift_card"
          ? { kind: "gift_card", id: `${k}`, addedAt: "", amountCents: i.unitPriceCents }
          : i.kind === "print"
            ? { kind: "print", id: `${k}`, addedAt: "", editionId: i.editionId!, quantity: i.quantity }
            : { kind: "guide", id: `${k}`, addedAt: "", workId: i.workId!, format: i.config.format!, level: i.config.level!, palette: i.config.palette! },
      );
      // With the order's promo code, priced as checkout prices it.
      const p = o.promoCode ? promoCodes.find((x) => x.code === o.promoCode)! : undefined;
      const promo = p && { code: p.code, kind: p.kind, value: p.value, scope: p.scope, label: p.label };
      const cart = priceLines(lines, { shippingMethod: o.shippingMethod, country: o.country, promo }, null);
      expect(cart.totals.totalCents).toBe(o.totalCents);
      expect((cart.totals.discountCents ?? 0) + (cart.totals.promo?.cents ?? 0)).toBe(o.discountCents);
    }
  });

  it("pays every order once, with a payment row; declines have no order", () => {
    const paid = new Set(m.payments.filter((p) => p.status === "succeeded").map((p) => p.orderId));
    for (const o of m.orders) expect(paid.has(o.id)).toBe(true);
    expect(m.payments.filter((p) => p.status === "failed").every((p) => p.orderId === null)).toBe(true);
  });

  it("gift-card balances never go below zero", () => {
    for (const g of m.giftCards) expect(g.balanceCents).toBeGreaterThanOrEqual(0);
  });
});

describe("funnel and reading", () => {
  const m = materialize(simAt(CLOCKS[2]!).rows, Date.parse(CLOCKS[2]!), handsOff);

  it("visits ≥ viewed ≥ cart ≥ checkout ≥ paid, every day; devices add up", () => {
    for (const d of m.traffic) {
      expect(d.visits).toBeGreaterThanOrEqual(d.viewed);
      expect(d.viewed).toBeGreaterThanOrEqual(d.cart);
      expect(d.cart).toBeGreaterThanOrEqual(d.checkout);
      expect(d.checkout).toBeGreaterThanOrEqual(d.paid);
      expect(Object.values(d.visitsByDevice).reduce((s, v) => s + v, 0)).toBe(d.visits);
    }
  });

  it("a guide is never finished before it is opened, and progress only moves forward", () => {
    for (const e of m.entitlements) {
      if (e.progress.completedAt) expect(e.openedAt).not.toBeNull();
      if (e.openedAt) expect(e.openedAt >= e.createdAt).toBe(true);
      expect(e.printsLeft).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("calibration on the boards", () => {
  const sim = simAt("2026-10-02T12:00:00Z");
  const month = (prefix: string) => [...sim.rows.orders, ...fixtureOrders].filter((o) => parisDay(o.paidAt).startsWith(prefix));
  const visitsOf = (prefix: string) => sim.rows.traffic.filter((d) => d.day.startsWith(prefix)).reduce((s, d) => s + d.visits, 0);

  it("July, August, September: paid orders and visits exact", () => {
    expect([month("2026-07").length, month("2026-08").length, month("2026-09").length]).toEqual([108, 133, 187]);
    expect([visitsOf("2026-07"), visitsOf("2026-08"), visitsOf("2026-09")]).toEqual([5400, 6045, 6680]);
    expect(Math.round((187 / visitsOf("2026-09")) * 1000) / 10).toBe(2.8);
  });

  const sept = month("2026-09");
  const share = (n: number, total: number) => (n * 100) / total;

  it("September mix within ±3 points of the boards", () => {
    const value = { guide: 0, print: 0, gift_card: 0 };
    let total = 0;
    for (const o of sept) {
      for (const i of o.items) value[i.kind] += i.unitPriceCents * i.quantity - i.discountCents;
      total += o.totalCents;
    }
    const report: Record<string, number> = {
      guides: share(value.guide, total), prints: share(value.print, total), giftCards: share(value.gift_card, total),
    };
    const levels = { beginner: 0, intermediate: 0, advanced: 0 };
    for (const o of sept) for (const i of o.items) if (i.kind === "guide") levels[i.config.level!] += 1;
    const guides = levels.beginner + levels.intermediate + levels.advanced;
    const simSept = sim.rows.orders.filter((o) => parisDay(o.paidAt).startsWith("2026-09"));
    const sources: Record<string, number> = {};
    for (const o of simSept) sources[o.source!] = (sources[o.source!] ?? 0) + 1;
    const fixtureSources: Record<string, string> = { TikTok: "tiktok", Instagram: "instagram", Google: "google", Newsletter: "newsletter", Pinterest: "pinterest", Friend: "referral" };
    for (const o of fixtureOrders.filter((x) => parisDay(x.paidAt).startsWith("2026-09"))) {
      const k = fixtureSources[CUSTOMER_SOURCES[o.userId] ?? ""] ?? "direct";
      sources[k] = (sources[k] ?? 0) + 1;
    }
    const traffic = sim.rows.traffic.filter((d) => d.day.startsWith("2026-09"));
    const dev = { phone: 0, desktop: 0, tablet: 0 };
    for (const d of traffic) for (const k of Object.keys(dev) as Array<keyof typeof dev>) dev[k] += d.visitsByDevice[k];
    Object.assign(report, {
      beginner: share(levels.beginner, guides), intermediate: share(levels.intermediate, guides), advanced: share(levels.advanced, guides),
      phone: share(dev.phone, 6680), desktop: share(dev.desktop, 6680), tablet: share(dev.tablet, 6680),
      tiktok: share(sources.tiktok ?? 0, 187), instagram: share(sources.instagram ?? 0, 187), direct: share(sources.direct ?? 0, 187),
      google: share(sources.google ?? 0, 187), newsletter: share(sources.newsletter ?? 0, 187),
    });
    const target: Record<string, number> = {
      guides: 55, prints: 30, giftCards: 8, beginner: 58, intermediate: 31, advanced: 11, phone: 71, desktop: 24, tablet: 5,
      tiktok: 49, instagram: 22, direct: 14, google: 9, newsletter: 6,
    };
    console.info("September mix (target):", Object.entries(report).map(([k, v]) => `${k} ${v.toFixed(1)} (${target[k]})`).join(", "));
    for (const [k, v] of Object.entries(report)) expect(Math.abs(v - target[k]!), k).toBeLessThanOrEqual(3);
  });

  it("September top works: N°03, N°01, N°07, N°02, N°05", () => {
    const counts = new Map<string, number>();
    for (const o of sept) for (const i of o.items) if (i.kind === "guide") counts.set(i.workId!, (counts.get(i.workId!) ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => works.find((w) => w.id === id)!.number);
    expect(top).toEqual(["N°03", "N°01", "N°07", "N°02", "N°05"]);
  });

  it("September store receipts near $4,960 (tuning goal ±5 %, reported, not blocking)", () => {
    const total = sept.reduce((s, o) => s + o.totalCents, 0) / 100;
    const gap = ((total - 4960) / 4960) * 100;
    console.info(`September store receipts: $${total.toFixed(2)} (${gap >= 0 ? "+" : ""}${gap.toFixed(1)} % vs $4,960)`);
    expect.soft(Math.abs(gap)).toBeLessThanOrEqual(5);
  });
});

describe("performance", () => {
  // CPU time (process.cpuUsage), not the wall clock: the work done, whatever else the machine is doing.
  const cpu = () => {
    const start = process.cpuUsage();
    return () => {
      const u = process.cpuUsage(start);
      return (u.user + u.system) / 1000;
    };
  };
  it("cold today < 400 ms, warm reopen < 150 ms (CPU); two years reported", () => {
    const today = parisDay(Date.now());
    let stop = cpu();
    const sim = simAt(new Date().toISOString());
    materialize(sim.rows, Date.now(), handsOff);
    const cold = stop();
    stop = cpu();
    sim.run(today); // nothing left to generate
    materialize(sim.rows, Date.now() + 60_000, handsOff);
    const warm = stop();
    stop = cpu();
    const two = new Simulator(SIM_SEED);
    two.run(addDays("2026-07-01", 730));
    materialize(two.rows, Date.parse(`${addDays("2026-07-01", 730)}T12:00:00Z`), handsOff);
    const projection = stop();
    console.info(`Sim performance (Node, CPU): cold ${cold.toFixed(0)} ms, warm ${warm.toFixed(0)} ms, 730 days cold ${projection.toFixed(0)} ms (${two.rows.orders.length} orders)`);
    expect(cold).toBeLessThan(400);
    expect(warm).toBeLessThan(150);
  });
});

describe("fixtures follow the 48 h rule", () => {
  const plans = fixturePlans(SIM_SEED);
  const at = (iso: string, frozen = new Map<string, number>()) => materializeFixtures(plans, Date.parse(iso), handsOff, frozen);

  it("the board's open items used by the e2e tests are still open on Oct 2, 12:00", () => {
    const m = at("2026-10-02T12:00:00Z");
    expect(m.copies.get("copy-ed-07-s-10")!.fulfilment).toBe("to_print"); // order-2041, paid Oct 1 14:02
    for (const id of ["thread-1", "thread-4", "thread-5", "thread-6"]) expect(m.threads.find((t) => t.id === id)!.status).toBe("open");
    for (const id of ["rev-1", "rev-2", "rev-3", "rev-4"]) expect(m.reviews.find((r) => r.id === id)!.status).toBe("pending");
    expect(m.candidates.every((c) => c.status === "pending")).toBe(true);
    // Camille's parcel (order-2028) is still in transit.
    expect(m.shipments.find((s) => s.id === "ship-2028")!.status).toBe("in_transit");
  });

  it("a week later, Lucas · simulated has handled them", () => {
    const m = at("2026-10-09T12:00:00Z");
    expect(["shipped", "delivered"]).toContain(m.copies.get("copy-ed-07-s-10")!.fulfilment);
    for (const id of ["thread-1", "thread-4", "thread-5", "thread-6"]) expect(m.threads.find((t) => t.id === id)!.status).toBe("done");
    expect(m.reviews.filter((r) => r.status === "pending")).toHaveLength(0);
    expect(m.candidates.filter((c) => c.status === "pending")).toHaveLength(0);
    expect(m.shipments.find((s) => s.id === "ship-2028")!.status).toBe("delivered");
    expect(m.audit.length).toBeGreaterThan(0);
  });

  it("what Lucas touched in the admin stays as he left it", () => {
    const m = at("2026-10-09T12:00:00Z", new Map([["order-2041", Date.parse("2026-10-02T12:00:00Z")], ["thread-1", Date.parse("2026-10-02T12:00:00Z")]]));
    expect(m.copies.get("copy-ed-07-s-10")!.fulfilment).toBe("to_print");
    expect(m.threads.find((t) => t.id === "thread-1")!.status).toBe("open");
  });
});
