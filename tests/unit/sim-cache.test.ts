/**
 * The history cache (docs/admin-v2/01 §2): an engine resumed from the cache — through a structured clone
 * or through the wire's ArrayBuffers — gives exactly the history of an engine run in one go (same hash,
 * raw and cut at now); the cache is read when it fits, ignored when the seed, the key or the clock says
 * otherwise, and a broken store never breaks anything.
 */
import { describe, expect, it } from "vitest";
import { HANDS_OFF_HOURS, SIM_SEED } from "@/sim/config";
import { Simulator } from "@/sim/generate";
import { historyHash, cyrb53 } from "@/sim/hash";
import { materialize } from "@/sim/materialize";
import { primeEngine, type HistoryRecord, type HistoryStore } from "@/sim/prime";
import { decodeRows, decodeState, encodeRows, encodeState } from "@/sim/wire";

const cut = (sim: Simulator, day: string) => {
  const m = materialize(sim.rows, Date.parse(`${day}T16:30:00Z`), HANDS_OFF_HOURS * 3_600_000);
  return cyrb53(JSON.stringify({ ...m, orderStatus: [...m.orderStatus] }));
};

const coldTo = (day: string, seed = SIM_SEED) => {
  const sim = new Simulator(seed);
  sim.run(day);
  return sim;
};

/** A store like IndexedDB: records are copied in and out (the buffers too). */
function memoryStore(): HistoryStore & { map: Map<string, HistoryRecord> } {
  const map = new Map<string, HistoryRecord>();
  return {
    map,
    async get(key) {
      const v = map.get(key);
      return v ? structuredClone(v) : null;
    },
    async put(key, record) {
      map.clear();
      map.set(key, structuredClone(record));
    },
  };
}

const rowsOf = (r: { rows: ArrayBuffer }) => decodeRows(r.rows);

describe("resume from a snapshot", () => {
  for (const [from, to] of [["2026-10-01", "2026-10-02"], ["2026-09-15", "2026-10-07"], ["2026-12-20", "2027-03-15"]] as const) {
    it(`${from} → ${to}: the same history as one run`, () => {
      const once = coldTo(to);
      const resumed = Simulator.restore(structuredClone(coldTo(from).snapshot()));
      resumed.run(to);
      expect(historyHash(resumed.rows)).toBe(historyHash(once.rows));
      expect(cut(resumed, to)).toBe(cut(once, to));
    });
  }

  it("day after day through a clone each time: still the same history", () => {
    const once = coldTo("2026-08-20");
    let sim = coldTo("2026-08-01");
    for (const day of ["2026-08-05", "2026-08-06", "2026-08-12", "2026-08-20"]) {
      sim = Simulator.restore(structuredClone(sim.snapshot()));
      sim.run(day);
    }
    expect(historyHash(sim.rows)).toBe(historyHash(once.rows));
  });
});

describe("the wire (ArrayBuffers of JSON)", () => {
  it("rows and engine state through bytes: the history goes on identically", () => {
    const once = coldTo("2027-03-15");
    const a = coldTo("2026-12-20");
    const rows = decodeRows(encodeRows(a.rows));
    const b = Simulator.restore(decodeState(encodeState(a.snapshot()), rows));
    b.run("2027-03-15");
    expect(historyHash(b.rows)).toBe(historyHash(once.rows));
    expect(cut(b, "2027-03-15")).toBe(cut(once, "2027-03-15"));
  });
});

describe("primeEngine and its cache", () => {
  const key = `${SIM_SEED}|engine-test`;

  it("first opening: generated from launch and kept; the same day again: nothing generated; days later: the missing days only — the same history every time", async () => {
    const store = memoryStore();
    const first = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    expect(first).toMatchObject({ from: "cold", cachedUpTo: null, lastDay: "2026-10-02" });
    expect(store.map.get(key)!.lastDay).toBe("2026-10-02");
    const again = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    expect(again).toMatchObject({ from: "cache", cachedUpTo: "2026-10-02", daysComputed: 0 });
    expect(historyHash(rowsOf(again))).toBe(historyHash(coldTo("2026-10-02").rows));
    const later = await primeEngine({ seed: SIM_SEED, today: "2026-10-07", key }, store);
    expect(later).toMatchObject({ from: "cache", cachedUpTo: "2026-10-02", daysComputed: 5 });
    expect(store.map.get(key)!.lastDay).toBe("2026-10-07");
    expect(historyHash(rowsOf(later))).toBe(historyHash(coldTo("2026-10-07").rows));
  });

  it("another key (seed, engine or sources changed): the cache is not read, and is replaced", async () => {
    const store = memoryStore();
    await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    const other = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key: `${key}-v2` }, store);
    expect(other.from).toBe("cold");
    expect([...store.map.keys()]).toEqual([`${key}-v2`]);
    // A record of another seed under the key is never used.
    const foreign = coldTo("2026-09-30", "another-seed");
    store.map.set(key, { seed: "another-seed", lastDay: "2026-09-30", rows: encodeRows(foreign.rows), state: encodeState(foreign.snapshot()) });
    expect((await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store)).from).toBe("cold");
  });

  it("the clock moved back before the cache: generated from launch, the later cache is kept", async () => {
    const store = memoryStore();
    await primeEngine({ seed: SIM_SEED, today: "2026-10-07", key }, store);
    const back = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    expect(back.from).toBe("cold");
    expect(historyHash(rowsOf(back))).toBe(historyHash(coldTo("2026-10-02").rows));
    expect(store.map.get(key)!.lastDay).toBe("2026-10-07");
  });

  it("no store, or a store that fails (private window): generated, no error", async () => {
    const none = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key: null }, null);
    const broken: HistoryStore = { get: () => Promise.reject(new Error("SecurityError")), put: () => Promise.reject(new Error("QuotaExceededError")) };
    const failing = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, broken);
    expect(none.from).toBe("cold");
    expect(failing.from).toBe("cold");
    expect(historyHash(rowsOf(failing))).toBe(historyHash(rowsOf(none)));
  });
});
