/**
 * Every assumption of the simulation in one place (docs/admin-v2/01 §6). Each value says where it comes
 * from: "board" (the admin boards Lucas already knows), "spec" (docs/admin-v2), "Stripe pricing FR",
 * or "estimate — confirm". Settings › Simulation shows them read-only; the seed and the hands-off hours
 * can be changed there (admin overlay).
 */
import { BUSINESS } from "@/config/business";
import type { Device, Source } from "@/data/types";

// ── Launch & seed ─────────────────────────────────────────────────────────────

/** Another seed is another "parallel universe" of the same business. spec 01 §2 */
export const SIM_SEED = "geste-2026";
/** First day of the store (Europe/Paris). spec */
export const LAUNCH_DATE = "2026-07-01";
/** First order number of the chronological sequence (GS-1001 on launch day). spec 01 §2 */
export const ORDER_NUMBER_START = 1001;
/** What needs a human and is younger than this stays open: today's to-do. spec 01 §5 */
export const HANDS_OFF_HOURS = 48;
/** Bump when the generator changes: cached histories of another version are rebuilt. */
export const SIM_VERSION = 1;

// ── Anchors (calibration on the figures the admin already shows) ──────────────

/**
 * Paid orders and visits per anchored month, exact (fixture orders included). board (dashboard, analytics)
 * In an anchored month the sources, devices, baskets and levels are drawn from "decks" sized on the
 * weights below (fixture orders deducted), so the month lands on the boards' mix whatever the seed.
 */
export const ANCHORS: Record<string, { orders: number; visits: number }> = {
  "2026-07": { orders: 108, visits: 5400 },
  "2026-08": { orders: 133, visits: 6045 },
  "2026-09": { orders: 187, visits: 6680 },
};

// ── Growth & seasonality (after the anchors) ──────────────────────────────────

/** Daily orders at the start of the trend: September's average. spec 01 §3 */
export const BASE_DAILY_ORDERS = 187 / 30;
/** Month-on-month growth: +12 % in October 2026, then −1 pt a month, never below +3 %. spec 01 §3 */
export const GROWTH = { firstMonth: "2026-10", firstPct: 12, stepPct: -1, floorPct: 3 };
/** Monday → Sunday. spec 01 §3 */
export const WEEKDAY_FACTORS = [0.9, 0.95, 1.0, 1.0, 1.05, 1.15, 1.2] as const;
/** Day-to-day noise (log-normal σ). spec 01 §3 */
export const DAILY_NOISE_SIGMA = 0.18;
/** Orders by hour of the day (Paris): low 01–07, peaks 12–14 and 20–23 (phone evenings). spec 01 §3 */
export const HOUR_WEIGHTS = [3, 1.5, 0.8, 0.5, 0.4, 0.5, 1, 2, 3.5, 4.5, 5, 5.5, 7.5, 8, 7, 5.5, 5, 5.5, 6.5, 7.5, 9, 9.5, 8.5, 5.5] as const;
/** A social "spike" post: that day, the next, the day after. spec 01 §3 */
export const SPIKE_FACTORS = [1.6, 1.25, 1.1] as const;
/** Newsletter send day. spec 01 §3 */
export const NEWSLETTER_DAY_FACTOR = 1.3;
/** Black Friday week (Monday → Sunday around the 4th Friday of November). spec 01 §3 */
export const BLACK_FRIDAY_FACTOR = 1.5;
/** Dec 1–22: more orders, and gift cards ×4. spec 01 §3 */
export const DECEMBER = { factor: 1.4, giftCardBoost: 4 };
/** Dec 24 → Jan 2. spec 01 §3 */
export const HOLIDAY_LULL_FACTOR = 0.7;
/** January. spec 01 §3 */
export const JANUARY_FACTOR = 0.85;
/** July–August from 2027 (2026's summer is anchored). spec 01 §3 */
export const SUMMER_FACTOR = { from: 2027, factor: 0.95 };

// ── Traffic & funnel ──────────────────────────────────────────────────────────

/** Paid orders ÷ visits outside the anchors (September's 2.8 %). board */
export const CONVERSION = 0.028;
/** Visits → viewed a work → cart → checkout (September's funnel 6,680 / 3,410 / 402 / 251 / 187). board */
export const FUNNEL = { viewed: 3410 / 6680, cart: 402 / 3410, paidOfCheckout: 187 / 251 };
/** Paid orders by source. board (analytics, September) */
export const SOURCE_WEIGHTS: Record<Source, number> = { tiktok: 49, instagram: 22, direct: 14, google: 9, newsletter: 6, pinterest: 0, referral: 0 };
/** On a spike day the TikTok share is multiplied by this (then 1.6, 1.2 the next days); on a newsletter day, the newsletter share by 5. estimate — confirm */
export const SOURCE_SHIFT = { tiktokOnSpike: [2.5, 1.6, 1.2], newsletterOnSend: 5 };
/** Visits and orders by device. board */
export const DEVICE_WEIGHTS: Record<Device, number> = { phone: 71, desktop: 24, tablet: 5 };

// ── Customers & countries ─────────────────────────────────────────────────────

/** Billing country of new customers. spec 01 §4 */
export const COUNTRY_WEIGHTS: Record<string, number> = { FR: 74, BE: 9, CH: 8, DE: 2, US: 4, GB: 2, NL: 0.4, ES: 0.3, IT: 0.3 };
/** First-time buyers who buy again within 60 days. board (analytics "repeat 24 %") */
export const REPEAT = { rate: 0.24, minDays: 5, maxDays: 60 } as const;
/** Newsletter opt-in at checkout. spec 01 §4 */
export const NEWSLETTER_OPT_IN = 0.38;
/** Visitors who subscribe in the footer or the guide page without buying (≈ 1,240 subscribers by Oct 2). estimate — confirm */
export const VISITOR_SUBSCRIBE_RATE = 0.058;
/** Subscribers leaving at each send. estimate — confirm */
export const UNSUBSCRIBE_PER_SEND = 0.004;

// ── Baskets ───────────────────────────────────────────────────────────────────

/** What an order holds (tuned so September lands on guides ≈ 55 %, prints ≈ 30 %, gift cards ≈ 8 %). spec 01 §3 */
export const BASKET_WEIGHTS = { guide: 0.845, twoGuides: 0.005, guideAndPrint: 0.02, print: 0.08, giftCard: 0.05 };
/** Guides by level (the format follows the level: a Beginner buyer takes the canvas whose default is Beginner). board (analytics) */
export const LEVEL_WEIGHTS = { beginner: 58, intermediate: 31, advanced: 11 };
/** Guides chosen in a non-Original palette. estimate — confirm */
export const OTHER_PALETTE_RATE = 0.22;
/** Popularity of each work's guide, N°01 → N°15 (top five on the board: N°03, N°01, N°07, N°02, N°05). board (dashboard "Top works") */
export const WORK_WEIGHTS = [48, 24, 66, 5, 13, 4, 36, 5, 1, 1, 3, 6, 2, 5, 2] as const;
/** Popularity of each work's prints, N°01 → N°15 (the Home's three first). board (Home) */
export const PRINT_WORK_WEIGHTS = [14, 6, 5, 3, 4, 3, 16, 10, 1, 2, 2, 2, 1, 3, 2] as const;
/** Print sizes. estimate — confirm */
export const PRINT_SIZE_WEIGHTS = { S: 70, M: 22, L: 8 };
/** Gift card amounts (presets of the GiftCard board). estimate — confirm */
export const GIFT_CARD_WEIGHTS: Record<number, number> = { 1500: 15, 3000: 40, 5000: 30, 10000: 12, 15000: 3 };
/**
 * Gift cards used by their recipient at checkout (a tender): 60 % are first used within 90 days; while
 * money is left, 75 % come back within 60 days for another order. The rest expires (breakage). Lucas, 2026-10-06
 */
export const GIFT_CARD_USE = { firstRate: 0.6, firstMinDays: 2, firstMaxDays: 90, againRate: 0.75, againMinDays: 3, againMaxDays: 60 } as const;
/** France: Mondial Relay / Colissimo home / Chronopost express. Abroad: Colissimo international. estimate — confirm */
export const SHIPPING_FR_WEIGHTS = { mondial_relay: 55, colissimo: 35, chronopost_express: 10 };

// ── Payments ──────────────────────────────────────────────────────────────────

/** spec 01 §4 */
export const PAYMENT_METHOD_WEIGHTS = { card: 82, wallet: 12, paypal: 6 };
export const WALLET_WEIGHTS = { apple_pay: 65, google_pay: 35 };
/** Share of premium (business, corporate…) cards: the Stripe fee is higher. Stripe pricing FR, estimate */
export const PREMIUM_CARD_RATE = 0.15;
export const THREE_DS_RATE = 0.31;
export const RISK_WEIGHTS = { low: 96, medium: 3.5, high: 0.5 };
/** Failed payment attempts (no order). spec 01 §4 */
export const DECLINE_RATE = 0.025;

// ── Fulfilment (working days, Paris) ──────────────────────────────────────────

/** Printed and signed the next working day, packed then, carrier pickup at 16:00. spec 01 §4 */
export const FULFILMENT = { printHour: [9, 12], packedSameDayRate: 0.6, pickupHour: 16, inTransitHour: [5, 7] } as const;
/** Working days from pickup to delivery by zone. spec 01 §4 */
export const DELIVERY_DAYS: Record<"FR" | "EU" | "INTL", [number, number]> = { FR: [1, 2], EU: [2, 4], INTL: [3, 6] };

// ── Reader ────────────────────────────────────────────────────────────────────

/** Guide opened: 70 % the same day, 92 % within 7 days, 3 % never. spec 01 §4 */
export const OPENING = { sameDay: 0.7, withinWeek: 0.92, never: 0.03 } as const;
/** Share of buyers reaching each of the 15 steps of N°03 (1a … 3e); other guides follow the same shape. board (analytics) */
export const COMPLETION_CURVE = [100, 97, 94, 93, 90, 84, 82, 80, 78, 71, 69, 66, 65, 63, 61] as const;
/** Days from opening to the last step reached. estimate — confirm */
export const PAINTING_DAYS = [0.2, 9] as const;
/** Buyers who print the guide once / twice (3 prints included). estimate — confirm */
export const GUIDE_PRINTS = { once: 0.2, twice: 0.05 } as const;

// ── Shopping lists & affiliate ────────────────────────────────────────────────

/** spec 01 §4 */
export const AFFILIATE = { opensList: 0.46, clicksPartner: 0.63, partnerConversion: 0.22, basketCents: [3000, 11000], returnDays: 30 } as const;
/** Partners (placeholders until real programmes are signed): rate, payout day, share of clicks. board (marketing) */
export const AFFILIATE_PARTNERS = [
  { id: "aff-a", name: "Art supply store A", ratePct: 8, payoutDay: 15, weight: 55 },
  { id: "aff-b", name: "Marketplace B", ratePct: 4, payoutDay: 20, weight: 35 },
  { id: "aff-c", name: "Canvas maker C", ratePct: 10, payoutDay: 10, weight: 10 },
] as const;

// ── Support, reviews, refunds ─────────────────────────────────────────────────

/** Threads per order and pre-sale questions. spec 01 §4 */
export const SUPPORT = { perOrder: 0.06, preSalePerOrder: 0.01, replyHours: [1, 8], doneHours: [0, 24] } as const;
/** Topics of order threads (where-is-my-print only for print orders). spec 01 §4 */
export const SUPPORT_TOPICS = { print_eta: 30, format_swap: 20, access: 20, refund: 15, invoice: 15 };
/** Finishers who leave a review, when, with a photo, how many stars. spec 01 §4 */
export const REVIEWS = { rate: 0.18, minDays: 2, maxDays: 10, photo: 0.6, stars: { 5: 68, 4: 25, 3: 5, 2: 1.5, 1: 0.5 } } as const;
/** Moderation outcome. estimate — confirm */
export const MODERATION = { published: 80, featured: 5, hidden: 15 };
/**
 * Promo codes used, in % of the orders that can use them: FIRSTCANVAS on a first order with a guide,
 * TIKTOK10 on orders from TikTok, NOEL2026 on any order Dec 1–24. Chosen by a hash of the order (not
 * the random stream), so the history is the same orders. estimate — confirm
 */
export const PROMO_USE: Record<string, number> = { FIRSTCANVAS: 12, TIKTOK10: 30, NOEL2026: 35 };
/** Featured reviews at once: the "Real results" row holds four photos; a newer feature replaces the oldest. Method board */
export const FEATURED_MAX = 4;
/** Refunds: share of orders, days after payment. spec 01 §4 */
export const REFUNDS = { rate: 0.018, minDays: 3, maxDays: 14 } as const;

// ── AI pipeline ───────────────────────────────────────────────────────────────

/** Jobs Lucas launches, candidates per job, how long a job runs, approvals (kept for later, no draft work). spec 01 §4 */
export const AI = { jobsPerWeek: 2, candidates: [3, 8], minutes: [20, 90], approveOneIn: 4 } as const;

// ── Social calendar ───────────────────────────────────────────────────────────

/** "First canvas" TikTok episodes, the posts that drive the spikes (ep. 04 on Sep 22, ep. 05 on Oct 5). board */
export const FIRST_CANVAS_EPISODES = ["2026-08-11", "2026-08-25", "2026-09-08", "2026-09-22", "2026-10-05"];
/** After ep. 05: one episode every 14 days. estimate — confirm */
export const EPISODE_EVERY_DAYS = 14;
/** Regular posts per week by network (no spike). estimate — confirm */
export const POSTS_PER_WEEK = { tiktok: 3, instagram: 2, pinterest: 1 };
/** The week drawn on the Marketing board (Oct 5–11, 2026) keeps its own posts. board */
export const FIXTURE_SOCIAL_WEEK = { from: "2026-10-05", to: "2026-10-11" };
/** Newsletters: second Tuesday of the month, 09:00 Paris, from November 2026 (July–October are in the fixtures). spec 01 §4 */
export const NEWSLETTER = { firstSimMonth: "2026-11", weekday: 2, nth: 2, hour: 9, openRate: [45, 58], clickRate: [4, 9] } as const;

// ── Money (Phase 3 moves these to src/config/business.ts) ─────────────────────

/** USD → EUR base rate and its daily drift: the books' rule (src/config/business.ts). */
export const FX = BUSINESS.fx.value;
