/**
 * The history cache (docs/admin-v2/01 §2): an engine resumed from a cached complete day gives exactly the
 * history of an engine run in one go (same hash, raw and cut at now); the cache is read when it fits,
 * ignored when the seed, the key or the clock says otherwise, and a broken store never breaks anything.
 */
import { describe, expect, it } from "vitest";
import { HANDS_OFF_HOURS, SIM_SEED } from "@/sim/config";
import { Simulator, type SimSnapshot } from "@/sim/generate";
import { historyHash, cyrb53 } from "@/sim/hash";
import { materialize } from "@/sim/materialize";
import { primeEngine, type SnapshotStore } from "@/sim/prime";

const cut = (sim: Simulator, day: string) => {
  const m = materialize(sim.rows, Date.parse(`${day}T16:30:00Z`), HANDS_OFF_HOURS * 3_600_000);
  return cyrb53(JSON.stringify({ ...m, orderStatus: [...m.orderStatus] }));
};

const coldTo = (day: string, seed = SIM_SEED) => {
  const sim = new Simulator(seed);
  sim.run(day);
  return sim;
};

/** A store like IndexedDB: values are structured clones, written and read. */
function memoryStore(): SnapshotStore & { map: Map<string, SimSnapshot>; puts: number } {
  const map = new Map<string, SimSnapshot>();
  return {
    map,
    puts: 0,
    async get(key) {
      const v = map.get(key);
      return v ? structuredClone(v) : null;
    },
    async put(key, snapshot) {
      this.puts++;
      map.clear();
      map.set(key, structuredClone(snapshot));
    },
  };
}

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

describe("primeEngine and its cache", () => {
  const key = `${SIM_SEED}|engine-test`;

  it("first opening: generated from launch, yesterday saved; reopening: from the cache, today only, same history", async () => {
    const store = memoryStore();
    const first = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    expect(first).toMatchObject({ from: "cold", cachedUpTo: null });
    expect(store.map.get(key)!.lastDay).toBe("2026-10-01");
    const again = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    expect(again).toMatchObject({ from: "cache", cachedUpTo: "2026-10-01", daysComputed: 1 });
    expect(historyHash(again.snapshot.rows)).toBe(historyHash(first.snapshot.rows));
    expect(historyHash(again.snapshot.rows)).toBe(historyHash(coldTo("2026-10-02").rows));
    // Five days later: the four missing complete days and today, then the new last complete day is kept.
    const later = await primeEngine({ seed: SIM_SEED, today: "2026-10-07", key }, store);
    expect(later).toMatchObject({ from: "cache", cachedUpTo: "2026-10-01", daysComputed: 6 });
    expect(store.map.get(key)!.lastDay).toBe("2026-10-06");
    expect(historyHash(later.snapshot.rows)).toBe(historyHash(coldTo("2026-10-07").rows));
  });

  it("another key (seed, engine or sources changed): the cache is not read, and is replaced", async () => {
    const store = memoryStore();
    await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    const other = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key: `${key}-v2` }, store);
    expect(other.from).toBe("cold");
    expect([...store.map.keys()]).toEqual([`${key}-v2`]);
    // A snapshot of another seed under the key is never used.
    store.map.set(key, structuredClone(coldTo("2026-09-30", "another-seed").snapshot()));
    expect((await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store)).from).toBe("cold");
  });

  it("the clock moved back before the cache: generated from launch, the later cache is kept", async () => {
    const store = memoryStore();
    await primeEngine({ seed: SIM_SEED, today: "2026-10-07", key }, store);
    const back = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, store);
    expect(back.from).toBe("cold");
    expect(historyHash(back.snapshot.rows)).toBe(historyHash(coldTo("2026-10-02").rows));
    expect(store.map.get(key)!.lastDay).toBe("2026-10-06");
  });

  it("no store, or a store that fails (private window): generated, no error", async () => {
    const none = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key: null }, null);
    const broken: SnapshotStore = { get: () => Promise.reject(new Error("SecurityError")), put: () => Promise.reject(new Error("QuotaExceededError")) };
    const failing = await primeEngine({ seed: SIM_SEED, today: "2026-10-02", key }, broken);
    expect(none.from).toBe("cold");
    expect(failing.from).toBe("cold");
    expect(historyHash(failing.snapshot.rows)).toBe(historyHash(none.snapshot.rows));
  });
});
