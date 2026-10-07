/**
 * Mock phase: the read path of every table (docs/admin-v2/01 §2 "Merge order").
 *
 *   fixtures (src/data) ∪ generated (src/sim, cut at simNow) ∪ browser purchases → then the admin overlay
 *
 * 1. Fixtures: the hand-written rows. They win over generated rows for the same id (the generator never
 *    uses a fixture id).
 * 2. Generated: the simulated business up to now (`simRows()`), on the server render (build) too.
 * 3. Purchases (`src/lib/client/purchases.ts`, "geste.purchases.v2"): what a mock checkout writes.
 *    Never cut by the clock: they happened in this browser.
 * 4. Admin overlay (`src/lib/client/admin.ts`, "geste.admin.v2"): patches keyed by table and row id, plus
 *    inserted rows. It always wins; once Lucas acts on a simulated order, the simulation stops there.
 *
 * Numbers are given at read time, in payment order over all sources: orders GS-1001…, edition copies
 * 1, 2, 3… with their certificate (docs/admin-v2/PLAN.md D7). Results are memoised until one of the
 * sources changes. Deleted with the stores when Supabase arrives (docs/mock-plan.md §5).
 */
import { customers } from "@/data/customers";
import { printCopies, printEditions } from "@/data/editions";
import { entitlements } from "@/data/entitlements";
import type { CampaignRow, GiftCardRow } from "@/data/marketing";
import { parisDay, simNow } from "@/lib/clock";
import { BUSINESS } from "@/config/business";
import { parisInstant, workingDayAfter } from "@/sim/calendar";
import { hashString } from "@/sim/random";
import { mockCarrierScans } from "@/lib/integrations/boxtal/mock";
import { campaigns as fixtureCampaigns, giftCards as fixtureGiftCards } from "@/data/marketing";
import { orders, refunds, shipments } from "@/data/orders";
import type {
  AffiliateClickDayRow, AffiliateCommissionRow, AiCandidateRow, AiJobRow, EntitlementRow, OrderRow, PaymentRow, PrintCopyRow, ProfileRow,
  RefundRow, ShipmentRow, SocialPostRow, SubscriberRow, SupportMessageRow, SupportThreadRow, TrafficDayRow,
} from "@/data/types";
import { works } from "@/data/works";
import { FEATURED_MAX, HANDS_OFF_HOURS, ORDER_NUMBER_START, SIM_SEED } from "@/sim/config";
import { fixtureDevice, fixtureSource } from "@/sim/fixtures";
import { preLaunchCounts, setSimSettings, simRows, simSettings, type MaterializedRows, type SimAuditLine } from "@/sim";
import { frozenSimOrder } from "@/sim/freeze";
import { fixturePlans, materializeFixtures, type MaterializedFixtures } from "@/sim/fixturePlans";

export interface LocalRows {
  orders: OrderRow[];
  entitlements: EntitlementRow[];
  copies: PrintCopyRow[];
}

/** Table name (as in the migration) → row id → changed columns (camelCase). */
export type OverlayPatches = Record<string, Record<string, Record<string, unknown>>>;
/** Table name → rows created in this browser, newest first. Every row has an `id`. */
export type OverlayInserts = Record<string, Array<Record<string, unknown> & { id: string }>>;

export interface AdminOverlay {
  patches: OverlayPatches;
  inserts: OverlayInserts;
}

const NONE: LocalRows = { orders: [], entitlements: [], copies: [] };
const NO_OVERLAY: AdminOverlay = { patches: {}, inserts: {} };
let source: () => LocalRows = () => NONE;
let overlaySource: () => AdminOverlay = () => NO_OVERLAY;

/** Called once by `src/lib/client/purchases.ts`. */
export function setLocalRowsSource(get: () => LocalRows) {
  source = get;
}

/** Called once by `src/lib/client/admin.ts`. */
export function setAdminOverlaySource(get: () => AdminOverlay) {
  overlaySource = get;
}

function local(): LocalRows {
  return typeof window === "undefined" ? NONE : source();
}

function overlay(): AdminOverlay {
  return typeof window === "undefined" ? NO_OVERLAY : overlaySource();
}

const EMPTY_SIM: MaterializedRows = {
  customers: [], orders: [], payments: [], copies: [], shipments: [], entitlements: [], refunds: [], giftCards: [], redemptions: [], threads: [], messages: [],
  reviews: [], traffic: [], subscribers: [], affiliateClicks: [], affiliateCommissions: [], socialPosts: [], campaigns: [], aiJobs: [], aiCandidates: [],
  orderStatus: new Map(), audit: [], now: 0, handsOffMs: 0,
};

/** Settings › Simulation (admin overlay): seed and hands-off window, applied to the engine before a read. */
function applySimSettings() {
  const s = patched("sim_settings", { id: "sim", seed: "", handsOffHours: Number.NaN as number });
  const current = simSettings();
  const seed = s.seed || SIM_SEED;
  const handsOffHours = Number.isFinite(s.handsOffHours) ? s.handsOffHours : HANDS_OFF_HOURS;
  if (current.seed !== seed || current.handsOffHours !== handsOffHours) setSimSettings({ seed, handsOffHours });
}

function sim(): MaterializedRows {
  applySimSettings();
  return simRows() ?? EMPTY_SIM;
}

/** Memo of a merge: computed again when the simulated rows, the purchases or the overlay change. */
function memo<T>(compute: () => T): () => T {
  let last: { s: MaterializedRows; l: LocalRows; o: AdminOverlay; value: T } | null = null;
  return () => {
    const s = sim(), l = local(), o = overlay();
    if (last && last.s === s && last.l === l && last.o === o) return last.value;
    const value = compute();
    last = { s, l, o, value };
    return value;
  };
}

/** One row with the admin's changes applied. */
export function patched<T extends { id: string }>(table: string, row: T): T {
  const p = overlay().patches[table]?.[row.id];
  return p ? { ...row, ...p } : row;
}

/** Rows inserted by the admin in this browser (newest first), typed by the caller. */
export function inserted<T>(table: string): T[] {
  return (overlay().inserts[table] ?? []) as T[];
}

/** Base rows + rows inserted in this browser, each with its patches. */
export function merged<T extends { id: string }>(table: string, base: T[]): T[] {
  return [...inserted<T>(table), ...base].map((r) => patched(table, r));
}

// ── Orders, numbered in payment order ─────────────────────────────────────────

/** Fixture orders get the fields the simulation fills (source, device, country), derived from the row. */
function enrichFixture(o: OrderRow): OrderRow {
  const customer = customers.find((c) => c.id === o.userId);
  return {
    ...o,
    source: fixtureSource(o),
    device: fixtureDevice(o),
    country: o.country ?? customer?.defaultAddress.country,
    origin: "fixture",
  };
}
const FIXTURE_ORDERS = orders.map(enrichFixture);

const byPaid = (a: { paidAt: string; id: string }, b: { paidAt: string; id: string }) => Date.parse(a.paidAt) - Date.parse(b.paidAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const ordersMemo = memo(() => {
  const s = frozenSim();
  const simOrders = s.orders.map((o) => {
    const status = s.orderStatus.get(o.id);
    return status ? { ...o, status } : o;
  });
  const browser = local().orders.map((o) => ({ ...o, origin: o.origin ?? ("browser" as const) }));
  const all = merged("orders", [...browser, ...simOrders, ...FIXTURE_ORDERS]);
  const numbered = [...all].sort(byPaid);
  const numbers = new Map(numbered.map((o, i) => [o.id, `GS-${ORDER_NUMBER_START + i}`]));
  const rows = all.map((o) => ({ ...o, number: numbers.get(o.id)!, items: o.items.map((i) => patched("order_items", i)) }));
  const byUser = new Map<string, OrderRow[]>();
  const byItem = new Map<string, OrderRow>();
  for (const o of rows) {
    byUser.set(o.userId, [...(byUser.get(o.userId) ?? []), o]);
    for (const i of o.items) byItem.set(i.id, o);
  }
  return { rows, byId: new Map(rows.map((o) => [o.id, o])), byNumber: new Map(rows.map((o) => [o.number, o])), byUser, byItem };
});

export const allOrders = (): OrderRow[] => ordersMemo().rows;
export const orderById = (id: string): OrderRow | undefined => ordersMemo().byId.get(id);
export const orderByNumber = (number: string): OrderRow | undefined => ordersMemo().byNumber.get(number);
export const ordersOfCustomer = (userId: string): OrderRow[] => ordersMemo().byUser.get(userId) ?? [];
export const orderOfItem = (itemId: string): OrderRow | undefined => ordersMemo().byItem.get(itemId);
/** "GS-1342" of an order id (audit lines, gift-card comments and tests refer to orders by id). */
export const orderNumberOf = (id: string): string | null => ordersMemo().byId.get(id)?.number ?? null;

// ── Edition copies, numbered in payment order ─────────────────────────────────

/** Copies sold before the store opened (pre-sale, first exhibition): stock and numbers, no store order. */
const PRE_LAUNCH_COPIES: PrintCopyRow[] = [...preLaunchCounts()].flatMap(([editionId, n]) =>
  Array.from({ length: n }, (_, k) => ({
    id: `copy-pre-${editionId}-${k + 1}`, editionId, number: k + 1, status: "sold" as const, orderItemId: null, fulfilment: "delivered" as const,
    certificateNo: null, printedAt: "2026-06-30T10:00:00Z", paidAt: "2026-06-30T10:00:00Z", soldBeforeLaunch: true, origin: "fixture" as const,
  })),
);

const ACTIVE: ReadonlyArray<PrintCopyRow["status"]> = ["sold", "reserved"];

/** "C-07-S-012": work, size and copy number, so the S and M copies of a work never share a certificate. */
/** When a copy sent to the lab comes back printed: the lab's turnaround in working days, at 10:00 Paris. */
export const labReadyAt = (sentAt: string): string => parisInstant(workingDayAfter(parisDay(sentAt), BUSINESS.printLab.value.turnaroundWorkingDays), 10);

export const certificateNumber = (editionId: string, number: number) => {
  const [, work, size] = editionId.split("-");
  return `C-${work}-${(size ?? "").toUpperCase()}-${String(number).padStart(3, "0")}`;
};

const copiesMemo = memo(() => {
  const paidOfItem = new Map<string, string>();
  for (const o of allOrders()) for (const i of o.items) paidOfItem.set(i.id, o.paidAt);
  const s = frozenSim();
  const fx = fixturesNow();
  const all = merged("print_copies", [...local().copies, ...s.copies, ...printCopies.map((c) => fx.copies.get(c.id) ?? c), ...PRE_LAUNCH_COPIES])
    .map((c) => ({ ...c, paidAt: c.paidAt ?? (c.orderItemId ? paidOfItem.get(c.orderItemId) : undefined) ?? "2026-06-30T10:00:00Z" }));
  // Numbers follow payment order within each edition (pre-launch copies first): each buyer gets the
  // lowest free number, and a copy put back in stock frees its number for the next buyer. A copy bought
  // in this browser keeps the number its buyer was shown (sold-out race: "Take 13/100 and pay").
  const browserIds = new Set(local().copies.map((c) => c.id));
  type Ev = { at: string; id: string; c: PrintCopyRow; back: boolean };
  const byEdition = new Map<string, Ev[]>();
  const push = (e: Ev) => byEdition.set(e.c.editionId, [...(byEdition.get(e.c.editionId) ?? []), e]);
  for (const c of all) {
    push({ at: c.paidAt!, id: c.id, c, back: false });
    // Back in stock (a refund with restock): the number is free from then on.
    if (c.status === "available" && c.orderItemId) push({ at: (c as { _at?: string })._at ?? c.paidAt!, id: c.id, c, back: true });
  }
  const numbered = new Map<string, number>();
  const taken = new Map<string, Set<number>>();
  for (const [editionId, events] of byEdition) {
    events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.back !== b.back ? (a.back ? 1 : -1) : a.id < b.id ? -1 : 1));
    const used = new Set(events.filter((e) => !e.back && browserIds.has(e.id)).map((e) => e.c.number));
    for (const e of events) {
      if (e.back) {
        if (!browserIds.has(e.id)) used.delete(numbered.get(e.id)!);
        else used.delete(e.c.number);
        continue;
      }
      if (browserIds.has(e.id)) {
        numbered.set(e.id, e.c.number);
        used.add(e.c.number);
        continue;
      }
      let n = 1;
      while (used.has(n)) n++;
      numbered.set(e.id, n);
      used.add(n);
    }
    taken.set(editionId, used);
  }
  // A delivered parcel closes its copies (the carrier's last scan).
  const delivered = (c: PrintCopyRow) => {
    if (c.fulfilment !== "shipped" || !c.orderItemId) return false;
    const orderId = orderOfItem(c.orderItemId)?.id;
    return !!(orderId && shipmentOfOrder(orderId)?.deliveredAt);
  };
  // Back from the lab: a copy sent to the external lab is printed once its turnaround has passed.
  const now = simNow().getTime();
  const fromLab = (c: PrintCopyRow) => {
    if (c.fulfilment !== "to_print" || !c.sentToLabAt) return null;
    const ready = labReadyAt(c.sentToLabAt);
    return Date.parse(ready) <= now ? { fulfilment: "printed" as const, printedAt: ready } : null;
  };
  const rows = all.map((c) => {
    const number = numbered.get(c.id)!;
    return { ...c, number, certificateNo: certificateNumber(c.editionId, number), ...fromLab(c), ...(delivered(c) ? { fulfilment: "delivered" as const } : {}) };
  });
  const byItem = new Map<string, PrintCopyRow[]>();
  const sold = new Map<string, number>();
  for (const c of rows) {
    if (c.orderItemId) byItem.set(c.orderItemId, [...(byItem.get(c.orderItemId) ?? []), c]);
    if (ACTIVE.includes(c.status)) sold.set(c.editionId, (sold.get(c.editionId) ?? 0) + 1);
  }
  return { rows, byItem, sold, taken };
});

/**
 * Stock of an edition, the one function the store, the cart, checkout and the admin read: copies taken,
 * reserved, left, the numbers the next buyers get (lowest free first, after the reserved ones), closed
 * by hand, sold out. A sold-out edition counts as closed; more copies (a bigger edition, a restock) reopen it.
 */
export function editionStock(editionId: string): { size: number; sold: number; reserved: number; left: number; numbers: number[]; closedByHand: boolean; soldOut: boolean; open: boolean } | null {
  const row = allPrintEditions().find((e) => e.id === editionId);
  if (!row) return null;
  const used = copiesMemo().taken.get(editionId) ?? new Set<number>();
  const free: number[] = [];
  for (let n = 1; n <= row.editionSize; n++) if (!used.has(n)) free.push(n);
  const numbers = free.slice(row.reservedCount);
  const sold = editionSoldCount(editionId);
  const left = Math.max(0, Math.min(row.editionSize - sold - row.reservedCount, numbers.length));
  return { size: row.editionSize, sold, reserved: row.reservedCount, left, numbers: numbers.slice(0, left), closedByHand: !row.open, soldOut: left === 0, open: row.open && left > 0 };
}

export const allPrintCopies = (): PrintCopyRow[] => copiesMemo().rows;
export const copiesOfItem = (itemId: string): PrintCopyRow[] => copiesMemo().byItem.get(itemId) ?? [];
/** Copies of an edition taken (sold or reserved), every source: the stock reads this. */
export const editionSoldCount = (editionId: string): number => copiesMemo().sold.get(editionId) ?? 0;
export const allPrintEditions = () => merged("print_editions", printEditions);

// ── Everything else ───────────────────────────────────────────────────────────

const customersMemo = memo(() => {
  const rows = merged("profiles", [...sim().customers, ...customers.map((c) => ({ ...c, origin: "fixture" as const }))]);
  return { rows, byId: new Map(rows.map((c) => [c.id, c])) };
});
export const allCustomers = (): ProfileRow[] => customersMemo().rows;
export const customerById = (id: string): ProfileRow | undefined => customersMemo().byId.get(id);

const entitlementsMemo = memo(() => {
  const rows = merged("entitlements", [...local().entitlements, ...sim().entitlements, ...entitlements]);
  return { rows, byItem: new Map(rows.map((e) => [e.orderItemId, e])) };
});
export const allEntitlements = (): EntitlementRow[] => entitlementsMemo().rows;
export const entitlementOfItem = (itemId: string): EntitlementRow | undefined => entitlementsMemo().byItem.get(itemId);

const byOrder = <T extends { orderId: string | null }>(rows: T[]) => {
  const m = new Map<string, T[]>();
  for (const r of rows) if (r.orderId) m.set(r.orderId, [...(m.get(r.orderId) ?? []), r]);
  return m;
};

const refundsMemo = memo(() => {
  const rows = merged("refunds", [...frozenSim().refunds, ...refunds]);
  return { rows, byOrder: byOrder(rows) };
});
export const allRefunds = (): RefundRow[] => refundsMemo().rows;
export const refundsOfOrder = (orderId: string): RefundRow[] => refundsMemo().byOrder.get(orderId) ?? [];

const shipmentsMemo = memo(() => {
  const fx = fixturesNow();
  const replaced = new Set(fixturePlans(simSettings().seed).shipments.map((s) => s.id));
  // Parcels the admin shipped get the carrier's scans as the clock passes them (mock tracking webhook).
  const o = overlay();
  const byAdmin = new Set([
    ...(o.inserts.shipments ?? []).map((s) => s.id),
    ...Object.entries(o.patches.shipments ?? {}).filter(([, p]) => (p as Partial<ShipmentRow>).shippedAt).map(([id]) => id),
  ]);
  const now = simNow().getTime();
  const rows = merged("shipments", [...frozenSim().shipments, ...fx.shipments, ...shipments.filter((s) => !replaced.has(s.id))]).map((s) => {
    if (!byAdmin.has(s.id) || !s.shippedAt || s.deliveredAt) return s;
    const scans = mockCarrierScans(s, now);
    return { ...s, ...scans, status: scans.deliveredAt ? ("delivered" as const) : ("in_transit" as const) };
  });
  return { rows, byOrder: byOrder(rows) };
});
export const allShipments = (): ShipmentRow[] => shipmentsMemo().rows;
export const shipmentOfOrder = (orderId: string): ShipmentRow | undefined => shipmentsMemo().byOrder.get(orderId)?.[0];

const threadsMemo = memo(() => {
  const rows = merged("support_threads", [...sim().threads, ...fixturesNow().threads]);
  return { rows, byOrder: byOrder(rows) };
});
export const allSupportThreads = (): SupportThreadRow[] => threadsMemo().rows;
export const threadsOfOrder = (orderId: string): SupportThreadRow[] => threadsMemo().byOrder.get(orderId) ?? [];
export const allSupportMessages = memo((): SupportMessageRow[] => [...sim().messages, ...fixturesNow().messages]);

/** The newest four featured reviews stay featured; older ones go back to published (the row holds four). */
function capFeatured<T extends { status: string; createdAt: string }>(rows: T[]): T[] {
  const keep = new Set(rows.filter((r) => r.status === "featured").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, FEATURED_MAX));
  return rows.map((r) => (r.status === "featured" && !keep.has(r) ? { ...r, status: "published" } : r));
}
export const allReviews = memo(() => merged("reviews", capFeatured([...sim().reviews, ...fixturesNow().reviews])));
/** The board's AI candidates, decided by "Lucas · simulated" once out of the hands-off window. */
export const fixtureAiCandidates = (): AiCandidateRow[] => fixturesNow().candidates;
/** Admin view of the works (status, copy). The store pages are built at deploy time and ignore it. */
export const allWorks = () => merged("works", works);
const worksById = memo(() => new Map(allWorks().map((w) => [w.id, w])));
const editionsById = memo(() => new Map(allPrintEditions().map((e) => [e.id, e])));
/** A work or an edition as the admin left it (overlay applied), by id. */
export const workById = (id: string | null | undefined) => (id ? worksById().get(id) : undefined);
export const editionById = (id: string | null | undefined) => (id ? editionsById().get(id) : undefined);

/** Gift cards, with what refunds paid back onto them added to their balance. */
/** A readable code for a card bought in this browser, stable per order line ("GESTE-2042-0001"). */
export const browserGiftCode = (itemId: string) => {
  const [, , n, i] = itemId.split("-");
  return `GESTE-${n}-${String(i).padStart(4, "0")}`;
};

/**
 * Gift cards: simulated, the board's, and those bought at checkout in this browser. Balances are net of
 * every use (simulated and board uses are in their rows; this browser's orders are taken off here) and
 * of refunds paid back onto them.
 */
export const allGiftCards = memo((): GiftCardRow[] => {
  const delta = new Map<string, number>();
  const add = (id: string, c: number) => delta.set(id, (delta.get(id) ?? 0) + c);
  for (const r of allRefunds()) for (const g of r.giftCards ?? []) add(g.giftCardId, g.cents);
  const browserOrders = local().orders;
  for (const o of browserOrders) if (o.status !== "pending" && o.status !== "cancelled") for (const g of o.giftCardRedemptions ?? []) add(g.giftCardId, -g.cents);
  const bought: GiftCardRow[] = browserOrders.flatMap((o) =>
    o.items.filter((i) => i.kind === "gift_card").map((i) => ({
      id: `gc-${i.id}`,
      code: browserGiftCode(i.id),
      initialCents: i.unitPriceCents,
      balanceCents: i.unitPriceCents,
      purchaseOrderId: o.id,
      senderName: customerById(o.userId)?.fullName ?? o.email,
      // The checkout's gift form: recipient and send date kept on the line.
      recipientName: i.config.recipientName ?? null,
      sendAt: i.config.sendOn ? `${i.config.sendOn}T08:00:00Z` : null,
      sentAt: i.config.sendOn && `${i.config.sendOn}T08:00:00Z` > simNow().toISOString() ? null : o.paidAt,
      createdAt: o.createdAt,
    })),
  );
  return merged("gift_cards", [...bought, ...sim().giftCards, ...fixtureGiftCards]).map((g) => (delta.has(g.id) ? { ...g, balanceCents: g.balanceCents + delta.get(g.id)! } : g));
});

/** A gift card by its code, as typed at checkout (case and spaces ignored). */
export const giftCardByCode = (code: string): GiftCardRow | undefined => {
  const c = code.replace(/\s+/g, "").toUpperCase();
  return allGiftCards().find((g) => g.code.replace(/\s+/g, "").toUpperCase() === c);
};
/**
 * Newsletters. A letter scheduled from the admin goes out at its time (the clock): sent then, with its
 * open and click rates once the first day has passed (Resend's webhooks later), drawn from its id.
 */
export const allCampaigns = memo((): CampaignRow[] => {
  const now = simNow().toISOString();
  return merged("campaigns", [...sim().campaigns, ...fixtureCampaigns]).map((c) => {
    if (c.sentAt || !c.scheduledAt || c.scheduledAt > now) return c;
    const h = hashString(`campaign|${c.id}`);
    const settled = Date.parse(now) - Date.parse(c.scheduledAt) > 86_400_000;
    return { ...c, sentAt: c.scheduledAt, month: c.month ?? null, openRate: settled ? 45 + (h % 20) : null, clickRate: settled ? Math.round((3 + ((h >> 5) % 70) / 10) * 10) / 10 : null };
  });
});
export const allPayments = (): PaymentRow[] => sim().payments;
export const allTraffic = (): TrafficDayRow[] => sim().traffic;
export const allSubscribers = (): SubscriberRow[] => sim().subscribers;
export const allAffiliateClicks = (): AffiliateClickDayRow[] => sim().affiliateClicks;
export const allAffiliateCommissions = (): AffiliateCommissionRow[] => sim().affiliateCommissions;
export const allSocialPosts = (): SocialPostRow[] => sim().socialPosts;
/** Simulated AI jobs and candidates (numbered with the fixture jobs by `src/lib/api/ai.ts`). */
export const simAiJobs = (): AiJobRow[] => sim().aiJobs;
export const simAiCandidates = (): AiCandidateRow[] => sim().aiCandidates;
/** "Lucas · simulated" audit lines, newest first. */
export const simAudit = memo((): SimAuditLine[] => [...sim().audit, ...fixturesNow().audit].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)));
/** Is the simulation on (Settings › Simulation; off when Supabase is Live later)? */
export const simEnabled = () => simSettings().enabled;

/** Copies of an edition bought in this browser. @deprecated The stock reads `editionSoldCount` (every source). */
export const localSoldCount = (editionId: string): number => local().copies.filter((c) => c.editionId === editionId).length;

// ── Lucas takes over a simulated order ────────────────────────────────────────

/**
 * What Lucas touched in the admin (overlay), with the time of his first action: orders (their row,
 * items, copies, a shipment or refund inserted for them), threads (read, replied), reviews, AI
 * candidates. Simulated and fixture plans of those stop there.
 */
const takeovers = memo(() => {
  const s = sim();
  const o = overlay();
  const touched = new Map<string, number>();
  const touch = (id: string | undefined, at: unknown) => {
    if (!id) return;
    const t = typeof at === "string" ? Date.parse(at) : Number.NaN;
    const when = Number.isNaN(t) ? 0 : t;
    touched.set(id, Math.min(touched.get(id) ?? Number.POSITIVE_INFINITY, when));
  };
  const orderOfItem = new Map<string, string>();
  for (const order of [...s.orders, ...orders]) for (const i of order.items) orderOfItem.set(i.id, order.id);
  const orderOfCopy = new Map([...s.copies, ...printCopies].map((c) => [c.id, c.orderItemId ? orderOfItem.get(c.orderItemId) : undefined]));
  for (const [id, p] of Object.entries(o.patches.orders ?? {})) touch(id, p._at);
  for (const [id, p] of Object.entries(o.patches.order_items ?? {})) touch(orderOfItem.get(id), p._at);
  for (const [id, p] of Object.entries(o.patches.print_copies ?? {})) touch(orderOfCopy.get(id) ?? undefined, p._at);
  for (const r of o.inserts.shipments ?? []) touch(r.orderId as string | undefined, r.labelCreatedAt ?? r.shippedAt);
  for (const r of o.inserts.refunds ?? []) touch(r.orderId as string | undefined, r.createdAt);
  for (const table of ["support_threads", "reviews", "ai_candidates"]) for (const [id, p] of Object.entries(o.patches[table] ?? {})) touch(id, p._at);
  for (const m of o.inserts.support_messages ?? []) touch(m.threadId as string | undefined, m.createdAt);
  return touched;
});

/** The fixtures' open items at now, through the same 48 h rule (src/sim/fixturePlans.ts). */
const fixturesNow = memo((): MaterializedFixtures => {
  const s = sim();
  const settings = simSettings();
  if (!settings.enabled || !s.now) return materializeFixtures(fixturePlans(settings.seed), Number.NEGATIVE_INFINITY, 0, new Map());
  return materializeFixtures(fixturePlans(settings.seed), s.now, s.handsOffMs, takeovers());
});

/** Simulated orders Lucas took over: their simulated human steps stop at his first action. */
const frozenSim = memo(() => {
  const s = sim();
  const all = takeovers();
  const touched = new Map<string, number>();
  for (const [id, t] of all) if (id.startsWith("order-s")) touched.set(id, t);
  if (!touched.size) return s;
  return frozenSimOrder(s, touched);
});
