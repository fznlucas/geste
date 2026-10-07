/**
 * The history on the wire and in the cache (docs/admin-v2/01 §2): two JSON documents in ArrayBuffers,
 * transferable to the page without a copy and stored as bytes in IndexedDB (reading bytes back costs
 * nothing; only the page decodes them, once). `rows`: every table, as generated. `state`: what the
 * engine needs to go on (schedules, balances, decks…); the maps that point into the rows (customers,
 * copies) are written by id and joined again on decoding.
 */
import type { SimSnapshot } from "./generate";
import type { SimRows } from "./types";

type MonthPlan = SimSnapshot["monthPlans"] extends Map<string, infer P> ? P : never;
type MapEntries<M> = M extends Map<infer K, infer V> ? Array<[K, V]> : never;

interface WireState {
  seed: string;
  lastDay: string | null;
  seq: MapEntries<SimSnapshot["seq"]>;
  /** Customer id → country, first name, orders (the row is in rows.customers). */
  customers: Array<[string, string, string, number]>;
  emails: MapEntries<SimSnapshot["emails"]>;
  repeats: MapEntries<SimSnapshot["repeats"]>;
  giftUses: MapEntries<SimSnapshot["giftUses"]>;
  giftBalance: MapEntries<SimSnapshot["giftBalance"]>;
  giftRecipient: MapEntries<SimSnapshot["giftRecipient"]>;
  taken: MapEntries<SimSnapshot["taken"]>;
  monthPlans: Array<[string, { orders: number[]; visits: number[]; decks: Record<string, Array<[string, number]>> }]>;
  activeSubscribers: number[];
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBytes = (value: unknown): ArrayBuffer => encoder.encode(JSON.stringify(value)).buffer as ArrayBuffer;
const fromBytes = <T>(buf: ArrayBuffer): T => JSON.parse(decoder.decode(buf)) as T;

export function encodeRows(rows: SimRows): ArrayBuffer {
  return toBytes(rows);
}

export function decodeRows(buf: ArrayBuffer): SimRows {
  return fromBytes<SimRows>(buf);
}

export function encodeState(s: SimSnapshot): ArrayBuffer {
  const state: WireState = {
    seed: s.seed,
    lastDay: s.lastDay,
    seq: [...s.seq],
    customers: [...s.customers].map(([id, c]) => [id, c.country, c.firstName, c.orders]),
    emails: [...s.emails],
    repeats: [...s.repeats],
    giftUses: [...s.giftUses],
    giftBalance: [...s.giftBalance],
    giftRecipient: [...s.giftRecipient],
    taken: [...s.taken],
    monthPlans: [...s.monthPlans].map(([month, p]) => [month, { orders: p.orders, visits: p.visits, decks: Object.fromEntries(Object.entries(p.decks).map(([k, m]) => [k, [...(m as Map<string, number>)]])) }]),
    activeSubscribers: s.activeSubscribers,
  };
  return toBytes(state);
}

/** The engine's snapshot from its two documents: the customers and copies maps point into `rows` again. */
export function decodeState(stateBuf: ArrayBuffer, rows: SimRows): SimSnapshot {
  const w = fromBytes<WireState>(stateBuf);
  const customerRow = new Map(rows.customers.map((r) => [r.id, r]));
  return {
    seed: w.seed,
    lastDay: w.lastDay,
    rows,
    seq: new Map(w.seq),
    customers: new Map(w.customers.map(([id, country, firstName, orders]) => [id, { row: customerRow.get(id)!, country, firstName, orders }])),
    copiesById: new Map(rows.copies.map((c) => [c.id, c])),
    emails: new Map(w.emails),
    repeats: new Map(w.repeats),
    giftUses: new Map(w.giftUses),
    giftBalance: new Map(w.giftBalance),
    giftRecipient: new Map(w.giftRecipient),
    taken: new Map(w.taken),
    monthPlans: new Map(w.monthPlans.map(([month, p]) => [month, { orders: p.orders, visits: p.visits, decks: Object.fromEntries(Object.entries(p.decks).map(([k, e]) => [k, new Map(e)])) as unknown as MonthPlan["decks"] }])),
    activeSubscribers: w.activeSubscribers,
  };
}
