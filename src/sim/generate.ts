/**
 * The day pipeline (docs/admin-v2/01 §4): `Simulator.run(until)` walks the Paris days from launch and
 * generates, for each, traffic, orders (priced by the same code as checkout), payments, copies,
 * library entitlements, gift cards, fulfilment, reading, shopping-list clicks, support, reviews,
 * refunds, newsletters, social posts and AI jobs. Every row carries its planned future; nothing here
 * reads the clock (see ./materialize.ts). Same seed → same rows, on every machine.
 */
import { addDays, parisDay } from "@/lib/clock";
import { LEVELS, LEVEL_ORDER, defaultLevel, formatLabel, formatsOf, type FormatKey, type LevelKey, type PrintSize, type ShippingMethod } from "@/lib/pricing";
import { priceLines, type PromoRule } from "@/lib/api/price-lines";
import type { StoredCartLine } from "@/lib/api/types";
import { printCopies as fixtureCopies, printEditions } from "@/data/editions";
import { guideId } from "@/data/guides";
import type { CampaignRow, GiftCardRow } from "@/data/marketing";
import { orders as fixtureOrders } from "@/data/orders";
import { includedVatCents } from "@/data/tax";
import type { Device, OrderItemRow, OrderRow, PaletteKey, PaymentRow, ProfileRow, Source, TrafficDayRow } from "@/data/types";
import { palettes, workFormats, works } from "@/data/works";
import {
  calendarFactor, daysInMonth, expectedOrders, isGiftSeason, isNewsletterDay, monthOf, parisInstant, spikeIndex, weekday,
  weekdayFactor, workingDayAfter, episodeDays,
} from "./calendar";
import {
  AFFILIATE, AFFILIATE_PARTNERS, AI, ANCHORS, BASKET_WEIGHTS, CONVERSION, COUNTRY_WEIGHTS, DAILY_NOISE_SIGMA, DECEMBER, DECLINE_RATE,
  DELIVERY_DAYS, DEVICE_WEIGHTS, FIXTURE_SOCIAL_WEEK, FULFILMENT, FUNNEL, GIFT_CARD_USE, GIFT_CARD_WEIGHTS, GUIDE_PRINTS, HOUR_WEIGHTS,
  LAUNCH_DATE, LEVEL_WEIGHTS, MODERATION, NEWSLETTER, NEWSLETTER_OPT_IN, OPENING, COMPLETION_CURVE, OTHER_PALETTE_RATE, PAINTING_DAYS,
  PAYMENT_METHOD_WEIGHTS, POSTS_PER_WEEK, PREMIUM_CARD_RATE, PROMO_USE, PRINT_SIZE_WEIGHTS, PRINT_WORK_WEIGHTS, REFUNDS, REPEAT, REVIEWS, RISK_WEIGHTS,
  SHIPPING_FR_WEIGHTS, SOURCE_SHIFT, SOURCE_WEIGHTS, SUPPORT, SUPPORT_TOPICS, THREE_DS_RATE, UNSUBSCRIBE_PER_SEND, VISITOR_SUBSCRIBE_RATE,
  WALLET_WEIGHTS, WORK_WEIGHTS,
} from "./config";
import { fixtureDevice, fixtureSource } from "./fixtures";
import { EMAIL_DOMAINS, NAME_POOLS, emailLocal } from "./names";
import { hashString, largestRemainder, rngFor, type Rng } from "./random";
import { promoCodes } from "@/data/marketing";
import { MONTH_NAMES, NEWSLETTER_SUBJECTS, REVIEW_TEXTS, SOCIAL_TITLES, THANKS, THREAD_TEXTS } from "./texts";
import { emptyRows, type PlannedEntitlement, type SimRows } from "./types";

const H = 3_600_000;
const DAY = 24 * H;
/** ISO instant `plusMs` after `iso`, to the second ("2026-10-01T14:02:00Z", like the fixtures). */
const at = (iso: string, plusMs: number) => new Date(Math.round((Date.parse(iso) + plusMs) / 1000) * 1000).toISOString().slice(0, 19) + "Z";
const pad = (n: number, w: number) => String(n).padStart(w, "0");

interface SimCustomer {
  row: ProfileRow;
  country: string;
  firstName: string;
  orders: number;
}

type BasketKind = keyof typeof BASKET_WEIGHTS;

/** Counts left to draw in an anchored month, so it lands on the boards' mix (see ANCHORS). */
interface Decks {
  source: Map<Source, number>;
  device: Map<Device, number>;
  basket: Map<BasketKind, number>;
  level: Map<LevelKey, number>;
  /** Work index (0 = N°01) as a string key. */
  work: Map<string, number>;
  size: Map<PrintSize, number>;
}

const ONE = { guide: 1, twoGuides: 1, guideAndPrint: 1, print: 1, giftCard: 1 } as const;
const LEVEL_ONE: Record<LevelKey, number> = { beginner: 1, intermediate: 1, advanced: 1 };
const WORK_ONE: Record<string, number> = Object.fromEntries(WORK_WEIGHTS.map((_, k) => [String(k), 1]));

/** Deck sizes: the month's targets (weights × total) minus what the fixtures already hold, summing to `size`. */
function deck<K extends string>(weights: Record<K, number>, total: number, fixtures: Map<K, number>, size: number): Map<K, number> {
  const keys = Object.keys(weights) as K[];
  const target = largestRemainder(keys.map((k) => weights[k]), total);
  const deficit = keys.map((k, i) => Math.max(0, target[i]! - (fixtures.get(k) ?? 0)));
  const counts = largestRemainder(deficit.some((d) => d > 0) ? deficit : keys.map((k) => weights[k]), size);
  return new Map(keys.map((k, i) => [k, counts[i]!]));
}

const countBy = <K>(list: K[]) => {
  const m = new Map<K, number>();
  for (const k of list) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};
type ThreadTopic = keyof typeof THREAD_TEXTS;

const HOUR_TABLE = HOUR_WEIGHTS.map((w, i) => [i, w] as const);
const WORK_TABLE = WORK_WEIGHTS.map((w, k) => [k, w] as const);
const PARTNER_TABLE = AFFILIATE_PARTNERS.map((x) => [x.id, x.weight] as const);
const isoOf = (ms: number) => new Date(Math.round(ms / 1000) * 1000).toISOString().slice(0, 19) + "Z";

const EU = new Set(["FR", "BE", "DE", "NL", "ES", "IT"]);
const BASKET_TABLES = new Map<string, Record<BasketKind, number>>();
const zoneOf = (country: string): "FR" | "EU" | "INTL" => (country === "FR" ? "FR" : EU.has(country) ? "EU" : "INTL");
const cardRegionOf = (country: string): PaymentRow["cardRegion"] => (country === "GB" ? "uk" : EU.has(country) ? "eea" : "intl");

/** Fixture orders and copies, indexed by Paris day: they count in the anchors and take edition numbers. */
const FIXTURE_ORDERS_BY_DAY = new Map<string, number>();
for (const o of fixtureOrders) FIXTURE_ORDERS_BY_DAY.set(parisDay(o.paidAt), (FIXTURE_ORDERS_BY_DAY.get(parisDay(o.paidAt)) ?? 0) + 1);
const FIXTURE_COPIES_BY_DAY = new Map<string, string[]>();
for (const c of fixtureCopies) {
  const order = fixtureOrders.find((o) => o.items.some((i) => i.id === c.orderItemId));
  if (!order) continue;
  const day = parisDay(order.paidAt);
  FIXTURE_COPIES_BY_DAY.set(day, [...(FIXTURE_COPIES_BY_DAY.get(day) ?? []), c.editionId]);
}

/** Copies sold before launch (docs/admin-v2/PLAN.md Q1): the editions' sold counts minus the fixture copies. */
export function preLaunchCounts(): Map<string, number> {
  const fixtureByEdition = new Map<string, number>();
  for (const c of fixtureCopies) fixtureByEdition.set(c.editionId, (fixtureByEdition.get(c.editionId) ?? 0) + 1);
  return new Map(printEditions.map((e) => [e.id, Math.max(0, e.soldCount - (fixtureByEdition.get(e.id) ?? 0))]));
}

/**
 * Everything the engine knows at the end of a day (docs/admin-v2/01 §2): the rows and the state the next
 * days read (customers, schedules, balances, decks…). Plain data only — Maps, arrays, rows — so it
 * crosses `postMessage` and IndexedDB by structured clone, shared references included (a customer's row is
 * the same object in `customers` and in `rows.customers`).
 */
export interface SimSnapshot {
  seed: string;
  lastDay: string | null;
  rows: SimRows;
  seq: Map<string, number>;
  customers: Map<string, SimCustomer>;
  copiesById: Map<string, SimRows["copies"][number]>;
  emails: Map<string, number>;
  repeats: Map<string, string[]>;
  giftUses: Map<string, string[]>;
  giftBalance: Map<string, number>;
  giftRecipient: Map<string, string>;
  taken: Map<string, number>;
  monthPlans: Map<string, { orders: number[]; visits: number[]; decks: Decks }>;
  activeSubscribers: number[];
}

export class Simulator {
  readonly rows: SimRows = emptyRows();
  /** Last day generated (inclusive), or null. */
  lastDay: string | null = null;

  private seq = new Map<string, number>();
  private customers = new Map<string, SimCustomer>();
  private copiesById = new Map<string, SimRows["copies"][number]>();
  private emails = new Map<string, number>();
  private repeats = new Map<string, string[]>();
  private giftUses = new Map<string, string[]>();
  private giftBalance = new Map<string, number>();
  /** Who received each gift card (set at its first use): they come back with it. */
  private giftRecipient = new Map<string, string>();
  private taken = preLaunchCounts();
  private monthPlans = new Map<string, { orders: number[]; visits: number[]; decks: Decks }>();
  private activeSubscribers: number[] = [];

  constructor(readonly seed: string) {}

  /** The engine's state, by reference: clone it (structuredClone, IndexedDB, postMessage) before running on. */
  snapshot(): SimSnapshot {
    return {
      seed: this.seed, lastDay: this.lastDay, rows: this.rows, seq: this.seq, customers: this.customers, copiesById: this.copiesById,
      emails: this.emails, repeats: this.repeats, giftUses: this.giftUses, giftBalance: this.giftBalance, giftRecipient: this.giftRecipient,
      taken: this.taken, monthPlans: this.monthPlans, activeSubscribers: this.activeSubscribers,
    };
  }

  /** An engine that goes on from a snapshot (owned from now on: pass a clone if the snapshot is used elsewhere). */
  static restore(s: SimSnapshot): Simulator {
    const sim = new Simulator(s.seed);
    Object.assign(sim, {
      rows: s.rows, lastDay: s.lastDay, seq: s.seq, customers: s.customers, copiesById: s.copiesById, emails: s.emails, repeats: s.repeats,
      giftUses: s.giftUses, giftBalance: s.giftBalance, giftRecipient: s.giftRecipient, taken: s.taken, monthPlans: s.monthPlans,
      activeSubscribers: s.activeSubscribers,
    });
    return sim;
  }

  private next(kind: string): number {
    const n = (this.seq.get(kind) ?? 0) + 1;
    this.seq.set(kind, n);
    return n;
  }

  private rng(...keys: Array<string | number>): Rng {
    return rngFor(this.seed, ...keys);
  }

  /** Generates every day after the last one, up to `until` (inclusive). */
  run(until: string) {
    let day = this.lastDay ? addDays(this.lastDay, 1) : LAUNCH_DATE;
    while (day <= until) {
      this.day(day);
      this.lastDay = day;
      day = addDays(day, 1);
    }
  }

  // ── Day counts (anchors or trend) ───────────────────────────────────────────

  private monthPlan(month: string) {
    let plan = this.monthPlans.get(month);
    if (plan) return plan;
    const anchor = ANCHORS[month]!;
    const days = daysInMonth(month).filter((d) => d >= LAUNCH_DATE);
    const r = this.rng(month, "anchor");
    const weights = days.map((d) => weekdayFactor(d) * calendarFactor(d) * r.lognormal(DAILY_NOISE_SIGMA));
    const fixtures = days.reduce((s, d) => s + (FIXTURE_ORDERS_BY_DAY.get(d) ?? 0), 0);
    // Fixture orders count toward the anchor: the simulation adds the rest.
    const simTotal = anchor.orders - fixtures;
    const orders = largestRemainder(weights, simTotal);
    const visits = largestRemainder(weights.map((w) => w * r.lognormal(0.06)), anchor.visits);
    const fixtureOrders_ = fixtureOrders.filter((o) => monthOf(parisDay(o.paidAt)) === month);
    const fixtureGuides = fixtureOrders_.flatMap((o) => o.items).filter((i) => i.kind === "guide").map((i) => i.config.level as LevelKey);
    const simGuides = Math.round(simTotal * (BASKET_WEIGHTS.guide + 2 * BASKET_WEIGHTS.twoGuides + BASKET_WEIGHTS.guideAndPrint));
    const decks: Decks = {
      source: deck(SOURCE_WEIGHTS, anchor.orders, countBy(fixtureOrders_.map((o) => fixtureSource(o))), simTotal),
      device: deck(DEVICE_WEIGHTS, anchor.orders, countBy(fixtureOrders_.map((o) => fixtureDevice(o))), simTotal),
      basket: deck(BASKET_WEIGHTS, simTotal, new Map(), simTotal),
      level: deck(LEVEL_WEIGHTS as Record<LevelKey, number>, simGuides + fixtureGuides.length, countBy(fixtureGuides), simGuides),
      work: deck(
        Object.fromEntries(WORK_WEIGHTS.map((w, k) => [String(k), w])),
        simGuides + fixtureGuides.length,
        countBy(fixtureOrders_.flatMap((o) => o.items).filter((i) => i.kind === "guide").map((i) => String(works.findIndex((w) => w.id === i.workId)))),
        simGuides,
      ),
      size: deck(PRINT_SIZE_WEIGHTS as Record<PrintSize, number>, Math.round(simTotal * (BASKET_WEIGHTS.print + BASKET_WEIGHTS.guideAndPrint)), new Map(), Math.round(simTotal * (BASKET_WEIGHTS.print + BASKET_WEIGHTS.guideAndPrint))),
    };
    plan = { orders, visits, decks };
    this.monthPlans.set(month, plan);
    return plan;
  }

  private dayCounts(day: string): { orders: number; visits: number } {
    const month = monthOf(day);
    if (ANCHORS[month]) {
      const plan = this.monthPlan(month);
      const i = daysInMonth(month).filter((d) => d >= LAUNCH_DATE).indexOf(day);
      return { orders: plan.orders[i]!, visits: plan.visits[i]! };
    }
    const r = this.rng(day, "counts");
    const lambda = expectedOrders(day) * r.lognormal(DAILY_NOISE_SIGMA);
    return { orders: r.poisson(lambda), visits: Math.round((lambda / CONVERSION) * r.lognormal(0.06)) };
  }

  // ── One day ─────────────────────────────────────────────────────────────────

  private day(day: string) {
    const { orders: simOrders, visits } = this.dayCounts(day);
    const fixtureOrderCount = FIXTURE_ORDERS_BY_DAY.get(day) ?? 0;
    for (const editionId of FIXTURE_COPIES_BY_DAY.get(day) ?? []) this.taken.set(editionId, (this.taken.get(editionId) ?? 0) + 1);

    const r = this.rng(day, "orders");
    // Order slots: repeat buyers and gift-card recipients due today first, then new customers.
    const repeats = this.repeats.get(day) ?? [];
    const gifts = this.giftUses.get(day) ?? [];
    this.repeats.delete(day);
    this.giftUses.delete(day);
    const slots: Array<{ customerId?: string; giftCardId?: string }> = [];
    for (const g of gifts) slots.push({ giftCardId: g, customerId: this.giftRecipient.get(g) });
    for (const c of repeats) slots.push({ customerId: c });
    if (slots.length > simOrders) {
      // Not enough orders today: the rest buy tomorrow.
      for (const s of slots.splice(simOrders)) {
        if (s.giftCardId) this.giftUses.set(addDays(day, 1), [...(this.giftUses.get(addDays(day, 1)) ?? []), s.giftCardId]);
        else this.repeats.set(addDays(day, 1), [...(this.repeats.get(addDays(day, 1)) ?? []), s.customerId!]);
      }
    }
    while (slots.length < simOrders) slots.push({});

    const times = slots.map(() => this.hourOf(r)).sort((a, b) => a - b);
    const sources: Source[] = [];
    const devices: Device[] = [];
    r.shuffle(slots);
    slots.forEach((slot, i) => {
      const order = this.order(day, times[i]!, slot, r);
      if (order) {
        sources.push(order.source!);
        devices.push(order.device!);
      } else if (slot.giftCardId) {
        // Nothing left to buy in that basket: the card's holder comes back tomorrow (the use is not lost).
        this.giftUses.set(addDays(day, 1), [...(this.giftUses.get(addDays(day, 1)) ?? []), slot.giftCardId]);
      }
    });

    this.declines(day, simOrders, r);
    this.traffic(day, visits, simOrders + fixtureOrderCount, r);
    this.subscribers(day, visits);
    this.preSaleQuestions(day, simOrders);
    this.social(day);
    this.newsletter(day);
    this.aiJobs(day);
  }

  /** Decks of the day's month (anchored months only). */
  private decksOf(day: string): Decks | undefined {
    return ANCHORS[monthOf(day)] ? this.monthPlan(monthOf(day)).decks : undefined;
  }

  /**
   * A draw from the month's deck (weighted by what is left × the day's own weights, so spike days still
   * lean to TikTok), or from the weights alone outside anchored months or once the deck is empty.
   */
  private draw<K extends string>(deckOf: Map<K, number> | undefined, weights: Readonly<Record<K, number>>, r: Rng): K {
    if (deckOf) {
      const entries = [...deckOf].filter(([k, n]) => n > 0 && (weights[k] ?? 0) > 0).map(([k, n]) => [k, n * weights[k]] as const);
      if (entries.length) {
        const k = r.weightedOnce(entries);
        deckOf.set(k, deckOf.get(k)! - 1);
        return k;
      }
    }
    return r.weighted(weights);
  }

  private hourOf(r: Rng): number {
    const h = r.weighted(HOUR_TABLE);
    return h + r.next();
  }

  private sourceTables = new Map<string, Record<Source, number>>();

  /** Source weights of a day: TikTok up on spike days, Newsletter up on send days. */
  private sourceWeights(day: string): Record<Source, number> {
    let w = this.sourceTables.get(day);
    if (!w) {
      w = { ...SOURCE_WEIGHTS };
      const s = spikeIndex(day);
      if (s !== null) w.tiktok *= SOURCE_SHIFT.tiktokOnSpike[s]!;
      if (isNewsletterDay(day)) w.newsletter *= SOURCE_SHIFT.newsletterOnSend;
      this.sourceTables.set(day, w);
    }
    return w;
  }

  private sourceOf(day: string, r: Rng): Source {
    return this.draw(this.decksOf(day)?.source, this.sourceWeights(day), r);
  }

  // ── Customers ───────────────────────────────────────────────────────────────

  private newCustomer(day: string, paidAt: string, source: Source, r: Rng): SimCustomer {
    const country = r.weighted(COUNTRY_WEIGHTS);
    const pool = NAME_POOLS[country] ?? NAME_POOLS.FR!;
    const firstName = r.pick(pool.first);
    const fullName = `${firstName} ${r.pick(pool.last)}`;
    const [city, postalCode] = r.pick(pool.cities);
    const local = emailLocal(fullName);
    const seen = this.emails.get(local) ?? 0;
    this.emails.set(local, seen + 1);
    const email = `${local}${seen ? seen + 1 : ""}@${r.pick(EMAIL_DOMAINS)}`;
    const n = this.next("customer");
    const row: ProfileRow = {
      id: `cus-s${pad(n, 5)}`,
      email,
      fullName,
      locale: country === "FR" || country === "BE" ? "fr" : "en",
      newsletter: r.chance(NEWSLETTER_OPT_IN),
      phone: null,
      defaultAddress: { name: fullName, line1: `${r.int(1, 120)} ${r.pick(pool.streets)}`, postalCode, city, country },
      createdAt: paidAt,
      source,
      origin: "sim",
    };
    const c: SimCustomer = { row, country, firstName, orders: 0 };
    this.customers.set(row.id, c);
    this.rows.customers.push(row);
    if (row.newsletter) this.subscribe(row.email, row.id, paidAt, "checkout");
    if (r.chance(REPEAT.rate)) {
      const d = addDays(day, r.int(REPEAT.minDays, REPEAT.maxDays));
      this.repeats.set(d, [...(this.repeats.get(d) ?? []), row.id]);
    }
    return c;
  }

  private subscribe(email: string, customerId: string | null, when: string, source: "checkout" | "footer" | "guide") {
    const n = this.next("subscriber");
    this.activeSubscribers.push(this.rows.subscribers.length);
    this.rows.subscribers.push({ id: `sub-s${pad(n, 6)}`, email, customerId, subscribedAt: when, unsubscribedAt: null, source, origin: "sim" });
  }

  // ── Baskets ─────────────────────────────────────────────────────────────────

  private guideLine(day: string, r: Rng, workIndex?: number): StoredCartLine {
    const decks = this.decksOf(day);
    const i = workIndex ?? (decks ? Number(this.draw(decks.work, WORK_ONE, r)) : r.weighted(WORK_TABLE));
    const work = works[i]!;
    const wanted = (decks ? this.draw(decks.level, LEVEL_ONE, r) : r.weighted(LEVEL_WEIGHTS)) as LevelKey;
    const formats = formatsOf(work.proportion).filter((f) => workFormats.some((x) => x.workId === work.id && x.format === f && x.active));
    const matching = formats.filter((f) => defaultLevel(f, work.baseLevel) === wanted);
    let format: FormatKey, level: LevelKey | "match";
    if (matching.length) {
      format = matching.length > 1 && r.chance(0.4) ? matching[1]! : matching[0]!;
      level = "match";
    } else {
      // No canvas has that level by default: the closest canvas with the level chosen ("Custom", free).
      const below = LEVEL_ORDER.indexOf(wanted) < LEVEL_ORDER.indexOf(work.baseLevel);
      format = below ? formats[0]! : formats[formats.length - 1]!;
      level = wanted;
    }
    const others = palettes.filter((p) => p.workId === work.id && p.active && p.key !== "original");
    const palette: PaletteKey = others.length && r.chance(OTHER_PALETTE_RATE) ? r.pick(others).key : "original";
    return { kind: "guide", id: `l${this.next("line")}`, addedAt: "", workId: work.id, format, level, palette };
  }

  private printLine(day: string, r: Rng, workId?: string): StoredCartLine | null {
    const open = printEditions.filter((e) => (this.taken.get(e.id) ?? 0) + e.reservedCount < e.editionSize && e.open);
    let candidates = workId ? open.filter((e) => e.workId === workId) : open;
    if (!candidates.length) return null;
    const sizes = this.decksOf(day)?.size;
    if (sizes) {
      // Anchored month: the size comes from the deck, then the work among that size's open editions.
      const size = this.draw(sizes, Object.fromEntries([...new Set(candidates.map((e) => e.size))].map((s) => [s, 1])) as Record<PrintSize, number>, r);
      candidates = candidates.filter((e) => e.size === size);
    }
    const edition = r.weightedOnce(
      candidates.map((e) => [e.id, (PRINT_WORK_WEIGHTS[works.findIndex((w) => w.id === e.workId)] ?? 1) * PRINT_SIZE_WEIGHTS[e.size as PrintSize]] as const),
    );
    return { kind: "print", id: `l${this.next("line")}`, addedAt: "", editionId: edition, quantity: 1 };
  }

  private basket(day: string, r: Rng, giftCard: boolean): StoredCartLine[] {
    const decks = this.decksOf(day);
    // One table per case (anchored month or not, gift season, paying with a gift card): built once, remembered.
    const key = `${decks ? 1 : 0}${isGiftSeason(day) ? 1 : 0}${giftCard ? 1 : 0}`;
    let weights = BASKET_TABLES.get(key);
    if (!weights) {
      weights = { ...(decks ? ONE : BASKET_WEIGHTS) };
      if (isGiftSeason(day)) weights.giftCard *= DECEMBER.giftCardBoost;
      // A gift card is not bought with a gift card.
      if (giftCard) weights.giftCard = 0;
      BASKET_TABLES.set(key, weights);
    }
    const kind = this.draw(decks?.basket, weights, r);
    if (kind === "giftCard") {
      return [{ kind: "gift_card", id: `l${this.next("line")}`, addedAt: "", amountCents: Number(r.weighted(GIFT_CARD_WEIGHTS)), recipientName: r.pick(NAME_POOLS.FR!.first) }];
    }
    if (kind === "print") {
      const p = this.printLine(day, r);
      if (p) return [p];
    }
    const first = this.guideLine(day, r);
    if (kind === "twoGuides") {
      let second = this.guideLine(day, r);
      if (second.kind === "guide" && first.kind === "guide" && second.workId === first.workId) second = this.guideLine(day, r);
      if (!(second.kind === "guide" && first.kind === "guide" && second.workId === first.workId)) return [first, second];
    }
    if (kind === "guideAndPrint" && first.kind === "guide") {
      const p = this.printLine(day, r, first.workId);
      if (p) return [first, p];
    }
    return [first];
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  /** The promo code an order uses, if any (config `PROMO_USE`, picked by a hash of the order id). */
  private promoFor(orderId: string, paidAt: string, firstOrder: boolean, source: Source): PromoRule | undefined {
    const roll = hashString(`promo|${orderId}`) % 100;
    for (const p of promoCodes) {
      if ((p.startsAt && p.startsAt > paidAt) || (p.endsAt && p.endsAt < paidAt)) continue;
      if (p.firstOrderOnly && !firstOrder) continue;
      if (p.code === "TIKTOK10" && source !== "tiktok") continue;
      if (roll < (PROMO_USE[p.code] ?? 0)) return { code: p.code, kind: p.kind, value: p.value, scope: p.scope, label: p.label };
    }
    return undefined;
  }

  private order(day: string, hour: number, slot: { customerId?: string; giftCardId?: string }, r: Rng): OrderRow | null {
    const paidAt = parisInstant(day, hour);
    const source = this.sourceOf(day, r);
    const device = this.draw(this.decksOf(day)?.device, DEVICE_WEIGHTS, r);
    const customer = slot.customerId ? this.customers.get(slot.customerId)! : this.newCustomer(day, paidAt, source, r);
    const lines = this.basket(day, r, !!slot.giftCardId);
    const country = customer.country;
    const hasPrint = lines.some((l) => l.kind === "print");
    const shippingMethod: ShippingMethod | null = !hasPrint ? null : country === "FR" ? (r.weighted(SHIPPING_FR_WEIGHTS) as ShippingMethod) : "international";
    let cart = priceLines(lines, { shippingMethod, country }, null);
    if (!cart.lines.some((l) => l.unavailable === null)) return null;

    const n = this.next("order");
    const orderId = `order-s${pad(n, 5)}`;
    // A promo code, by the rules checkout applies (dates, first order, scope; never on a gift card).
    const promo = this.promoFor(orderId, paidAt, customer.orders === 0, source);
    if (promo) {
      const withPromo = priceLines(lines, { shippingMethod, country, promo }, null);
      if (withPromo.totals.promo) cart = withPromo;
    }
    const payable = cart.lines.filter((l) => l.unavailable === null);
    const items: OrderItemRow[] = payable.map((line, index) => {
      const stored = lines.find((l) => l.id === line.id)!;
      const id = `item-s${pad(n, 5)}-${index + 1}`;
      if (stored.kind === "gift_card") {
        return { id, kind: "gift_card", workId: null, guideId: null, editionId: null, config: {}, title: `Gift card $${line.unitPriceCents / 100}`, detail: "Sent by email", unitPriceCents: line.unitPriceCents, quantity: 1, discountCents: 0, fulfilment: "not_required" };
      }
      if (stored.kind === "print") {
        const edition = printEditions.find((e) => e.id === stored.editionId)!;
        const work = works.find((w) => w.id === edition.workId)!;
        return { id, kind: "print", workId: work.id, guideId: null, editionId: edition.id, config: {}, title: `Print ${work.number}`, detail: `${edition.size} · edition`, unitPriceCents: line.unitPriceCents, quantity: line.quantity, discountCents: (line.discountCents ?? 0) + (line.promoCents ?? 0), fulfilment: "to_print" };
      }
      const work = works.find((w) => w.id === stored.workId)!;
      const level = stored.level === "match" ? defaultLevel(stored.format, work.baseLevel) : stored.level;
      return {
        id, kind: "guide", workId: work.id, guideId: guideId(work.slug, stored.format, level), editionId: null,
        config: { format: stored.format, level, palette: stored.palette },
        title: `Guide ${work.number}`, detail: line.detail,
        unitPriceCents: line.unitPriceCents, quantity: 1, discountCents: (line.discountCents ?? 0) + (line.promoCents ?? 0), fulfilment: "not_required",
      };
    });
    const subtotalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
    const discountCents = items.reduce((s, i) => s + i.discountCents, 0);
    const shippingCents = cart.totals.shippingCents ?? 0;
    const totalCents = subtotalCents - discountCents + shippingCents;

    // Gift card used as a tender (the total is unchanged).
    let redemptions: OrderRow["giftCardRedemptions"];
    if (slot.giftCardId) {
      const balance = this.giftBalance.get(slot.giftCardId) ?? 0;
      const cents = Math.min(balance, totalCents);
      if (cents > 0) {
        redemptions = [{ giftCardId: slot.giftCardId, cents }];
        this.giftBalance.set(slot.giftCardId, balance - cents);
        this.rows.redemptions.push({ id: `red-s${this.next("redemption")}`, giftCardId: slot.giftCardId, orderId, cents, at: paidAt });
        this.giftRecipient.set(slot.giftCardId, customer.row.id);
        // Money left on the card: the recipient often comes back for another order.
        if (balance - cents > 0 && r.chance(GIFT_CARD_USE.againRate)) {
          const d = addDays(day, r.int(GIFT_CARD_USE.againMinDays, GIFT_CARD_USE.againMaxDays));
          this.giftUses.set(d, [...(this.giftUses.get(d) ?? []), slot.giftCardId]);
        }
      }
    }
    const payment = this.payment(orderId, customer.row.id, paidAt, country, totalCents - (redemptions?.[0]?.cents ?? 0), r);
    customer.orders++;
    const order: OrderRow = {
      id: orderId, number: "", userId: customer.row.id, email: customer.row.email, status: "paid",
      subtotalCents, discountCents, shippingCents, shippingMethod,
      taxCents: includedVatCents(totalCents, country), totalCents,
      shippingAddress: hasPrint ? customer.row.defaultAddress : null,
      stripePaymentIntent: payment.id.replace("pay-s", "pi_3Ps"), cardLast4: pad(r.int(0, 9999), 4), risk: payment.risk,
      withdrawalWaived: items.some((i) => i.kind === "guide") && r.chance(0.97),
      paidAt, createdAt: paidAt, items, source, device, country, paymentId: payment.id, giftCardRedemptions: redemptions, origin: "sim",
      ...(cart.totals.promo ? { promoCode: cart.totals.promo.code } : {}),
    };
    this.rows.orders.push(order);
    this.afterPayment(day, order, customer, r);
    return order;
  }

  private payment(orderId: string | null, customerId: string | null, when: string, country: string, amountCents: number, r: Rng, failed = false): PaymentRow {
    const method = r.weighted(PAYMENT_METHOD_WEIGHTS) as PaymentRow["method"];
    const region = cardRegionOf(country);
    const row: PaymentRow = {
      id: `pay-s${pad(this.next("payment"), 6)}`, orderId, customerId, at: when, method,
      wallet: method === "wallet" ? (r.weighted(WALLET_WEIGHTS) as "apple_pay" | "google_pay") : null,
      cardRegion: method === "paypal" ? "eea" : region,
      premiumCard: method !== "paypal" && r.chance(PREMIUM_CARD_RATE),
      threeDS: method === "card" && region === "eea" && r.chance(THREE_DS_RATE) ? (failed && r.chance(0.3) ? "failed" : "passed") : "not_required",
      risk: r.weighted(RISK_WEIGHTS) as PaymentRow["risk"],
      amountCents, status: failed ? "failed" : "succeeded",
      declineCode: failed ? r.pick(["card_declined", "insufficient_funds", "expired_card", "authentication_required"]) : null,
      origin: "sim",
    };
    this.rows.payments.push(row);
    return row;
  }

  /** Failed attempts: 2.5 % of attempts, never an order. */
  private declines(day: string, orders: number, r: Rng) {
    const n = r.poisson((orders * DECLINE_RATE) / (1 - DECLINE_RATE));
    for (let i = 0; i < n; i++) this.payment(null, null, parisInstant(day, this.hourOf(r)), r.weighted(COUNTRY_WEIGHTS), r.int(15, 80) * 100, r, true);
  }

  // ── After payment: what the Stripe webhook does, then what follows ──────────

  private afterPayment(day: string, order: OrderRow, customer: SimCustomer, r: Rng) {
    const zone = zoneOf(customer.country);
    const copyIds: string[] = [];
    for (const item of order.items) {
      if (item.kind === "print" && item.editionId) {
        for (let q = 0; q < item.quantity; q++) {
          const taken = (this.taken.get(item.editionId) ?? 0) + 1;
          this.taken.set(item.editionId, taken);
          const id = `copy-s${pad(this.next("copy"), 5)}`;
          copyIds.push(id);
          const copy: SimRows["copies"][number] = {
            id, editionId: item.editionId, number: taken, status: "sold", orderItemId: item.id, fulfilment: "to_print", certificateNo: null, printedAt: null,
            paidAt: order.paidAt, packedAt: null, origin: "sim", plan: null,
          };
          this.rows.copies.push(copy);
          this.copiesById.set(id, copy);
        }
      }
      if (item.kind === "gift_card") {
        const n = this.next("giftcard");
        const code = `GESTE-${pad(n, 4)}-${r.int(1000, 9999)}`;
        const card: GiftCardRow = {
          id: `gc-s${pad(n, 5)}`, code, initialCents: item.unitPriceCents, balanceCents: item.unitPriceCents, purchaseOrderId: order.id,
          senderName: customer.row.fullName, recipientName: r.pick(NAME_POOLS.FR!.first), sendAt: null, sentAt: order.paidAt, createdAt: order.paidAt,
        };
        this.rows.giftCards.push(card);
        this.giftBalance.set(card.id, card.initialCents);
        if (r.chance(GIFT_CARD_USE.firstRate)) {
          const d = addDays(day, r.int(GIFT_CARD_USE.firstMinDays, GIFT_CARD_USE.firstMaxDays));
          this.giftUses.set(d, [...(this.giftUses.get(d) ?? []), card.id]);
        }
      }
      if (item.kind === "guide" && item.guideId) this.entitlement(order, item, r);
    }
    if (copyIds.length) this.fulfil(order, copyIds, zone, r);
    const hasGuide = order.items.some((i) => i.kind === "guide");
    if (hasGuide) this.shoppingList(day, order, r);
    this.supportAndRefund(order, customer, r);
  }

  /** Print copies: printed and signed the next working day, packed, picked up at 16:00, carried. */
  private fulfil(order: OrderRow, copyIds: string[], zone: "FR" | "EU" | "INTL", r: Rng) {
    const paidDay = parisDay(order.paidAt);
    const printDay = workingDayAfter(paidDay, 1);
    const printedAt = parisInstant(printDay, r.between(FULFILMENT.printHour[0], FULFILMENT.printHour[1]));
    const sameDay = r.chance(FULFILMENT.packedSameDayRate);
    const packDay = sameDay ? printDay : workingDayAfter(printDay, 1);
    const packedAt = sameDay ? at(printedAt, r.between(1.5, 4) * H) : parisInstant(packDay, r.between(9, 12));
    const labelCreatedAt = at(packedAt, r.between(5, 20) * 60_000);
    const pickupDay = Date.parse(labelCreatedAt) < Date.parse(parisInstant(packDay, FULFILMENT.pickupHour - 0.5)) ? packDay : workingDayAfter(packDay, 1);
    const shippedAt = parisInstant(pickupDay, FULFILMENT.pickupHour + r.between(0, 0.5));
    const transitDay = workingDayAfter(pickupDay, 1);
    const inTransitAt = parisInstant(transitDay, r.between(FULFILMENT.inTransitHour[0], FULFILMENT.inTransitHour[1]));
    const [minD, maxD] = DELIVERY_DAYS[zone];
    const deliveryDay = workingDayAfter(pickupDay, r.int(minD, maxD));
    const outForDeliveryAt = parisInstant(deliveryDay, r.between(7, 9));
    const deliveredAt = parisInstant(deliveryDay, r.between(10, 17));
    for (const id of copyIds) this.copiesById.get(id)!.plan = { orderId: order.id, printedAt, packedAt };
    const sizes = order.items.filter((i) => i.kind === "print").map((i) => printEditions.find((e) => e.id === i.editionId)!.size as PrintSize);
    const tube = sizes.includes("L") ? 80 : sizes.includes("M") ? 70 : 60;
    const kg = sizes.reduce((s, size) => s + (size === "L" ? 0.8 : size === "M" ? 0.6 : 0.4), 0);
    const method = order.shippingMethod;
    const carrier = method === "mondial_relay" ? "mondial_relay" : method === "chronopost_express" ? "chronopost" : "colissimo";
    const trackingNo =
      carrier === "mondial_relay" ? pad(r.int(0, 99_999_999), 8)
        : carrier === "chronopost" ? `XY${pad(r.int(0, 999_999_999), 9)}FR`
          : zone === "FR" ? `6A${pad(r.int(0, 99_999_999_999), 11)}` : `CA${pad(r.int(0, 99_999_999), 8)}FR`;
    this.rows.shipments.push({
      id: `ship-s${pad(this.next("shipment"), 5)}`, orderId: order.id, carrier, trackingNo,
      parcel: `Tube ${tube} cm · ${kg.toFixed(1)} kg`, status: "label_created",
      labelCreatedAt: null, shippedAt: null, inTransitAt: null, outForDeliveryAt: null, deliveredAt: null,
      plan: { paidAt: order.paidAt, labelCreatedAt, shippedAt, inTransitAt, outForDeliveryAt, deliveredAt },
    });
  }

  /** A guide in the buyer's library: opened, painted step by step, maybe finished, maybe printed. */
  private entitlement(order: OrderRow, item: OrderItemRow, r: Rng) {
    const level = (item.config.level ?? "intermediate") as LevelKey;
    const layers = Math.min(LEVELS[level].layers, 3);
    const steps = Array.from({ length: layers * 5 }, (_, i) => `${Math.floor(i / 5) + 1}${"abcde"[i % 5]}`);
    const paidMs = Date.parse(order.paidAt);
    let openedMs: number | null = null;
    const u = r.next();
    if (u < OPENING.sameDay) openedMs = paidMs + r.between(0.05, 5) * H;
    else if (u < OPENING.withinWeek) openedMs = paidMs + r.between(1, 7) * DAY;
    else if (u < 1 - OPENING.never) openedMs = paidMs + r.between(8, 40) * DAY;
    const openedAt = openedMs === null ? null : isoOf(openedMs);
    const plan: PlannedEntitlement["plan"] = { openedAt, steps: [], completedAt: null, printsAt: [] };
    if (openedMs !== null) {
      // How far the painter goes: the completion curve, stretched to this guide's number of steps.
      const reach = r.next() * 100;
      const curveAt = (i: number) => COMPLETION_CURVE[Math.round((i * (COMPLETION_CURVE.length - 1)) / (steps.length - 1))]!;
      let last = 0;
      for (let i = 0; i < steps.length; i++) if (reach < curveAt(i)) last = i;
      const span = r.between(PAINTING_DAYS[0], PAINTING_DAYS[1]) * DAY * (level === "advanced" ? 1.4 : level === "beginner" ? 0.7 : 1);
      let lastMs = openedMs;
      for (let i = 0; i <= last; i++) {
        lastMs = openedMs + (span * i) / (steps.length - 1) + (i ? r.between(0, 0.02) * DAY : 0);
        plan.steps.push([lastMs, steps[i]!]);
      }
      if (last === steps.length - 1) plan.completedAt = isoOf(lastMs + r.between(5, 40) * 60_000);
      const prints = r.next() < GUIDE_PRINTS.twice ? 2 : r.next() < GUIDE_PRINTS.once ? 1 : 0;
      for (let k = 0; k < prints; k++) plan.printsAt.push(openedMs + r.between(0.01, 1) * span);
      plan.printsAt.sort((a, b) => a - b);
      if (plan.completedAt && r.chance(REVIEWS.rate)) this.review(order, item, plan.completedAt, r);
    }
    this.rows.entitlements.push({
      id: `ent-s${pad(this.next("entitlement"), 6)}`, userId: order.userId, guideId: item.guideId!, orderItemId: item.id,
      paletteKey: (item.config.palette ?? "original") as PaletteKey, printsLeft: 3, progress: { step: steps[0]! }, openedAt: null, revokedAt: null,
      createdAt: order.paidAt, plan,
    });
  }

  private review(order: OrderRow, item: OrderItemRow, completedAt: string, r: Rng) {
    const rating = Number(r.weighted(REVIEWS.stars)) as 1 | 2 | 3 | 4 | 5;
    const createdAt = at(completedAt, r.between(REVIEWS.minDays, REVIEWS.maxDays) * DAY);
    const work = works.find((w) => w.id === item.workId)!;
    const status = rating <= 2 ? (r.chance(0.3) ? "hidden" : "published") : (r.weighted(MODERATION) as "published" | "featured" | "hidden");
    this.rows.reviews.push({
      id: `rev-s${pad(this.next("review"), 5)}`, userId: order.userId, workId: work.id, rating, body: r.pick(REVIEW_TEXTS[rating]!),
      photoPath: r.chance(REVIEWS.photo) ? work.previewPath : null, status: "pending", createdAt,
      plan: { status, decidedAt: at(createdAt, r.between(0.5, 3) * DAY) },
    });
  }

  /** Shopping list opened, partner clicked, sometimes a sale at the partner (commission). */
  private shoppingList(day: string, order: OrderRow, r: Rng) {
    if (!r.chance(AFFILIATE.opensList)) return;
    let row = this.rows.affiliateClicks.at(-1);
    if (!row || row.day !== day) {
      row = { day, listOpens: 0, clicks: {} };
      this.rows.affiliateClicks.push(row);
    }
    row.listOpens++;
    if (!r.chance(AFFILIATE.clicksPartner)) return;
    const partnerId = r.weighted(PARTNER_TABLE);
    const partner = AFFILIATE_PARTNERS.find((p) => p.id === partnerId)!;
    row.clicks[partner.id] = (row.clicks[partner.id] ?? 0) + 1;
    if (!r.chance(AFFILIATE.partnerConversion)) return;
    const saleAt = at(order.paidAt, r.between(0.02, 3) * DAY);
    const basketCents = r.int(AFFILIATE.basketCents[0] / 100, AFFILIATE.basketCents[1] / 100) * 100;
    const confirmedAt = at(saleAt, AFFILIATE.returnDays * DAY);
    const confirmedDay = parisDay(confirmedAt);
    // Paid on the partner's payout day of the month after confirmation.
    const [y, m] = confirmedDay.split("-").map(Number) as [number, number];
    const paidMonth = new Date(Date.UTC(y, m, 1));
    const paidDay = `${paidMonth.getUTCFullYear()}-${pad(paidMonth.getUTCMonth() + 1, 2)}-${pad(partner.payoutDay, 2)}`;
    this.rows.affiliateCommissions.push({
      id: `aff-s${pad(this.next("commission"), 5)}`, partnerId: partner.id, orderId: order.id, at: saleAt, basketCents,
      commissionCents: Math.round((basketCents * partner.ratePct) / 100), confirmedAt, paidAt: parisInstant(paidDay, 10),
    });
  }

  // ── Support and refunds ─────────────────────────────────────────────────────

  private thread(opts: { userId: string | null; email: string; firstName: string; orderId: string | null; topic: ThreadTopic; createdAt: string; work?: string; format?: string }, r: Rng) {
    const t = THREAD_TEXTS[opts.topic];
    const fill = (s: string) => s.replace("{work}", opts.work ?? "my work").replace("{name}", opts.firstName).replace("{format}", opts.format ?? "40×50");
    const n = this.next("thread");
    const id = `thread-s${pad(n, 5)}`;
    const replyAt = this.workingHoursAfter(opts.createdAt, r.between(SUPPORT.replyHours[0], SUPPORT.replyHours[1]));
    const doneAt = at(replyAt, r.between(SUPPORT.doneHours[0], SUPPORT.doneHours[1]) * H);
    this.rows.threads.push({
      id, userId: opts.userId, email: opts.email, subject: fill(r.pick(t.subjects)), orderId: opts.orderId,
      category: opts.topic === "refund" ? "refund" : opts.topic === "access" ? "problem" : "question",
      status: "open", readAt: null, createdAt: opts.createdAt, updatedAt: opts.createdAt,
      plan: { doneAt, readAt: at(replyAt, -r.between(2, 20) * 60_000) },
    });
    const m = (from: "customer" | "staff", body: string, createdAt: string, human: boolean, after: string | null) =>
      this.rows.messages.push({ id: `msg-s${pad(this.next("message"), 6)}`, threadId: id, from, body, staffName: from === "staff" ? "Lucas" : null, createdAt, plan: { human, after } });
    m("customer", fill(r.pick(t.bodies)), opts.createdAt, false, null);
    m("staff", fill(t.reply), replyAt, true, null);
    if (r.chance(0.3)) m("customer", r.pick(THANKS), at(replyAt, r.between(0.5, 12) * H), false, replyAt);
    return { id, replyAt };
  }

  /** `hours` of studio time after `iso` (09:00–19:00 Paris, working days). */
  private workingHoursAfter(iso: string, hours: number): string {
    let day = parisDay(iso);
    const local = (Date.parse(iso) - Date.parse(parisInstant(day, 0))) / H;
    let start = Math.max(9, local);
    if (!this.isStudioDay(day) || start >= 19) {
      day = workingDayAfter(addDays(day, 1), 0);
      start = 9;
    }
    let left = hours;
    while (start + left > 19) {
      left -= 19 - start;
      day = workingDayAfter(addDays(day, 1), 0);
      start = 9;
    }
    return parisInstant(day, start + left);
  }

  private isStudioDay(day: string): boolean {
    return workingDayAfter(day, 0) === day;
  }

  private supportAndRefund(order: OrderRow, customer: SimCustomer, r: Rng) {
    const firstPrint = order.items.find((i) => i.kind === "print");
    const guide = order.items.find((i) => i.kind === "guide");
    const work = works.find((w) => w.id === (guide ?? firstPrint)?.workId)?.number;
    if (r.chance(REFUNDS.rate) && (guide || firstPrint)) {
      const createdAt = at(order.paidAt, r.between(REFUNDS.minDays, REFUNDS.maxDays) * DAY);
      const { replyAt } = this.thread({ userId: order.userId, email: order.email, firstName: customer.firstName, orderId: order.id, topic: "refund", createdAt, work }, r);
      // Damaged print: the print is refunded (shipping was used); otherwise the guide, not opened.
      const printPart = firstPrint ? firstPrint.unitPriceCents * firstPrint.quantity - firstPrint.discountCents : 0;
      const guidePart = guide ? guide.unitPriceCents - guide.discountCents : 0;
      const isPrint = !!firstPrint && (!guide || r.chance(0.5));
      const amountCents = isPrint ? printPart : guidePart;
      this.rows.refunds.push({
        id: `refund-s${pad(this.next("refund"), 5)}`, orderId: order.id, amountCents,
        reason: isPrint ? "Print damaged in transit" : "Changed my mind — guide not opened",
        restock: false, revokeAccess: !isPrint, createdAt: replyAt,
        plan: { requestedAt: createdAt, orderStatus: amountCents >= order.totalCents ? "refunded" : "partially_refunded", restockCopyIds: [] },
      });
      return;
    }
    if (!r.chance(SUPPORT.perOrder - REFUNDS.rate)) return;
    const weights: Record<string, number> = { ...SUPPORT_TOPICS };
    delete weights.refund;
    if (!firstPrint) delete weights.print_eta;
    const topic = r.weightedOnce(weights) as ThreadTopic;
    const lags: Record<string, [number, number]> = { print_eta: [2, 6], format_swap: [0.05, 2], access: [0.01, 1], invoice: [0, 10] };
    const [a, b] = lags[topic] ?? [0, 3];
    const format = guide?.config.format ? formatLabel(r.pick(formatsOf(works.find((w) => w.id === guide.workId)!.proportion))) : undefined;
    this.thread({ userId: order.userId, email: order.email, firstName: customer.firstName, orderId: order.id, topic, createdAt: at(order.paidAt, r.between(a, b) * DAY), work, format }, r);
  }

  /** Questions before buying (no order). */
  private preSaleQuestions(day: string, orders: number) {
    const r = this.rng(day, "presale");
    const n = r.poisson(orders * SUPPORT.preSalePerOrder);
    for (let i = 0; i < n; i++) {
      const pool = NAME_POOLS.FR!;
      const firstName = r.pick(pool.first);
      const fullName = `${firstName} ${r.pick(pool.last)}`;
      this.thread({ userId: null, email: `${emailLocal(fullName)}@${r.pick(EMAIL_DOMAINS)}`, firstName, orderId: null, topic: "pre_sale", createdAt: parisInstant(day, this.hourOf(r)) }, r);
    }
  }

  // ── Traffic, subscribers ────────────────────────────────────────────────────

  private traffic(day: string, visits: number, paid: number, r: Rng) {
    const sw = this.sourceWeights(day);
    this.sourceTables.delete(day);
    const sources = Object.keys(sw) as Source[];
    const bySource = largestRemainder(sources.map((k) => sw[k]), visits);
    const devices = Object.keys(DEVICE_WEIGHTS) as Device[];
    const byDevice = largestRemainder(devices.map((k) => DEVICE_WEIGHTS[k] * r.lognormal(0.05)), visits);
    const v = Math.max(visits, paid);
    const checkout = Math.min(v, Math.max(paid, Math.round((paid / FUNNEL.paidOfCheckout) * r.lognormal(0.08))));
    const viewed = Math.min(v, Math.max(checkout, Math.round(v * FUNNEL.viewed * r.lognormal(0.04))));
    const cart = Math.min(viewed, Math.max(checkout, Math.round(viewed * FUNNEL.cart * r.lognormal(0.06))));
    const row: TrafficDayRow = {
      day, visits: v, viewed, cart, checkout, paid,
      visitsBySource: Object.fromEntries(sources.map((k, i) => [k, bySource[i]!])) as Record<Source, number>,
      visitsByDevice: Object.fromEntries(devices.map((k, i) => [k, byDevice[i]!])) as Record<Device, number>,
    };
    this.rows.traffic.push(row);
  }

  private subscribers(day: string, visits: number) {
    const r = this.rng(day, "subscribers");
    const n = r.poisson(visits * VISITOR_SUBSCRIBE_RATE);
    for (let i = 0; i < n; i++) {
      const pool = NAME_POOLS[r.weighted(COUNTRY_WEIGHTS)] ?? NAME_POOLS.FR!;
      const local = emailLocal(`${r.pick(pool.first)} ${r.pick(pool.last)}`);
      this.subscribe(`${local}${r.int(1, 99)}@${r.pick(EMAIL_DOMAINS)}`, null, parisInstant(day, this.hourOf(r)), r.chance(0.7) ? "footer" : "guide");
    }
  }

  // ── Social calendar, newsletters ────────────────────────────────────────────

  private social(day: string) {
    if (day >= FIXTURE_SOCIAL_WEEK.from && day <= FIXTURE_SOCIAL_WEEK.to) return;
    const r = this.rng(day, "social");
    const post = (network: "tiktok" | "instagram" | "pinterest", title: string, spike: boolean) => {
      const base = spike ? 40_000 : network === "tiktok" ? 2_500 : network === "instagram" ? 1_200 : 600;
      const views = Math.round(base * r.lognormal(0.5));
      this.rows.socialPosts.push({
        id: `post-s${pad(this.next("post"), 5)}`, network, at: parisInstant(day, r.between(17, 21)), title, spike,
        views, likes: Math.round(views * r.between(0.05, 0.09)), linkClicks: Math.round(views * r.between(0.01, 0.02)), origin: "sim",
      });
    };
    const episodes = episodeDays(day);
    if (episodes.at(-1) === day) post("tiktok", `First canvas ep. ${pad(episodes.length, 2)}`, true);
    const wd = weekday(day);
    // Regular posts on fixed weekdays: TikTok Mon/Wed/Sat, Instagram Tue/Fri, Pinterest Thu.
    const plan: Record<number, Array<"tiktok" | "instagram" | "pinterest">> = { 0: ["tiktok"], 1: ["instagram"], 2: ["tiktok"], 3: ["pinterest"], 4: ["instagram"], 5: ["tiktok"] };
    for (const network of plan[wd] ?? []) {
      if (POSTS_PER_WEEK[network] > 0) post(network, r.pick(SOCIAL_TITLES[network]), false);
    }
  }

  private newsletter(day: string) {
    if (!isNewsletterDay(day) || monthOf(day) < NEWSLETTER.firstSimMonth) return;
    const r = this.rng(day, "newsletter");
    const month = MONTH_NAMES[Number(day.slice(5, 7)) - 1]!;
    const sentAt = parisInstant(day, NEWSLETTER.hour);
    const row: CampaignRow = {
      id: `camp-s-${day.slice(0, 7)}`, subject: NEWSLETTER_SUBJECTS[(this.seq.get("campaign") ?? 0) % NEWSLETTER_SUBJECTS.length]!, bodyMd: "",
      audience: "all", scheduledAt: at(sentAt, -2 * DAY), sentAt, month,
      openRate: Math.round(r.between(NEWSLETTER.openRate[0], NEWSLETTER.openRate[1])), clickRate: Math.round(r.between(NEWSLETTER.clickRate[0], NEWSLETTER.clickRate[1]) * 10) / 10,
    };
    this.next("campaign");
    this.rows.campaigns.push(row);
    // A few subscribers leave at each send.
    const leaving = Math.round(this.activeSubscribers.length * UNSUBSCRIBE_PER_SEND);
    for (let i = 0; i < leaving && this.activeSubscribers.length; i++) {
      const k = r.int(0, this.activeSubscribers.length - 1);
      const index = this.activeSubscribers.splice(k, 1)[0]!;
      this.rows.subscribers[index]!.unsubscribedAt = at(sentAt, r.between(0.1, 48) * H);
    }
  }

  // ── AI pipeline ─────────────────────────────────────────────────────────────

  private aiJobs(day: string) {
    // The board's own jobs (114–118) run on Oct 1–2, 2026: no simulated job those two days.
    if (day === "2026-10-01" || day === "2026-10-02") return;
    const r = this.rng(day, "ai");
    const n = r.poisson(AI.jobsPerWeek / 7);
    for (let k = 0; k < n; k++) {
      const work = r.pick(works);
      const candidates = r.int(AI.candidates[0], AI.candidates[1]);
      const style = r.pick(["gestural", "colour_field", "drips_veils"] as const);
      const format = r.pick(formatsOf(work.proportion));
      const palette = r.pick(["original", "warm", "cool", "earth"] as const);
      const createdAt = parisInstant(day, r.between(9, 19));
      const finishesAt = at(createdAt, r.between(AI.minutes[0], AI.minutes[1]) * 60_000);
      const id = `job-s${pad(this.next("job"), 4)}`;
      const short = style === "gestural" ? "Gestural" : style === "colour_field" ? "Colour field" : "Drips & veils";
      const layers = r.int(2, 4);
      const maxStrokes = r.int(6, 16) * 10;
      this.rows.aiJobs.push({
        id, number: 0, params: { style, format, medium: r.chance(0.85) ? "acrylic" : "gouache", palette, maxStrokes, layers, candidates },
        label: `${short} · ${palette} · ${formatLabel(format)}`, status: "queued", progress: 0, costCents: Math.round(candidates * 17.5), createdAt,
        plan: { finishesAt },
      });
      const approve = r.chance(1 / AI.approveOneIn);
      const made = Array.from({ length: candidates }, (_, i) => ({ i, similarity: 78 + r.int(0, 19), strokes: Math.round(maxStrokes * r.between(0.45, 1.15)) }));
      const best = Math.max(...made.map((m) => m.similarity));
      const decidedAt = at(finishesAt, r.between(0.5, 3) * DAY);
      for (const m of made) {
        const winner = approve && m.similarity === best && made.find((x) => x.similarity === best) === m;
        this.rows.aiCandidates.push({
          id: `${id}-${"abcdefghij"[m.i]}`, jobNumber: 0, imagePath: `mock/work-${pad(r.int(1, 15), 2)}.jpg`, similarity: m.similarity, strokes: m.strokes, layers,
          note: winner ? "Kept for later" : m.strokes > maxStrokes ? "Too many strokes for level" : m.similarity < 85 ? "Low similarity" : m.similarity === best ? "Best score" : "",
          status: "pending", workSlug: null, createdAt: finishesAt,
          plan: { status: winner ? "approved" : "rejected", decidedAt },
        });
      }
    }
  }
}
