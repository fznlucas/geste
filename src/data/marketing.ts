/** Promo codes, gift cards, newsletter, affiliate partners and the social calendar (AdminMarketing). */

export type PromoKind = "percent" | "amount";
export type PromoScope = "guides" | "prints" | "everything";

/** `promo_codes`. `label` is the board's discount wording ("−15% first guide"). */
export interface PromoRow {
  id: string;
  code: string;
  kind: PromoKind;
  value: number; // percent or cents
  scope: PromoScope;
  firstOrderOnly: boolean;
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
  /** Where it is shared ("TikTok bio"). */
  note: string;
  label: string;
  createdAt: string;
}

/**
 * Uses are counted from the orders that carry the code (docs/admin-v2/05 "Marketing"). A promo never
 * discounts a gift card. NOEL2026: −20 % on guides and prints, Dec 1–24 (Paris), decided by Lucas.
 * TIKTOK10 starts with the TikTok bio link (Aug 10).
 */
export const promoCodes: PromoRow[] = [
  { id: "promo-firstcanvas", code: "FIRSTCANVAS", kind: "percent", value: 15, scope: "guides", firstOrderOnly: true, maxUses: null, startsAt: "2026-07-01T09:00:00Z", endsAt: null, note: "Print card", label: "−15% first guide", createdAt: "2026-07-01T09:00:00Z" },
  { id: "promo-tiktok10", code: "TIKTOK10", kind: "percent", value: 10, scope: "everything", firstOrderOnly: false, maxUses: null, startsAt: "2026-08-10T09:00:00Z", endsAt: null, note: "TikTok bio", label: "−10%", createdAt: "2026-08-10T09:00:00Z" },
  { id: "promo-noel2026", code: "NOEL2026", kind: "percent", value: 20, scope: "everything", firstOrderOnly: false, maxUses: null, startsAt: "2026-11-30T23:00:00Z", endsAt: "2026-12-24T22:59:59Z", note: "Scheduled Dec 1", label: "−20% guides and prints", createdAt: "2026-09-20T09:00:00Z" },
];

/** `gift_cards`. Each was bought in an order (GS-2039, GS-2012, GS-2030): a card is money received and owed until used. */
export interface GiftCardRow {
  id: string;
  code: string;
  initialCents: number;
  balanceCents: number;
  purchaseOrderId: string | null;
  /** "Léa Dubois", "Paul G." */
  senderName: string;
  /** First name on the card ("Marc"). */
  recipientName: string | null;
  sendAt: string | null;
  sentAt: string | null;
  createdAt: string;
  /** Cancelled in the admin (what was left becomes turnover that day). */
  voidedAt?: string | null;
  /** Validity extended in the admin (default: two years after purchase). */
  expiresAt?: string | null;
}

export const giftCards: GiftCardRow[] = [
  { id: "gc-4f2k", code: "GESTE-4F2K-91AA", initialCents: 5000, balanceCents: 5000, purchaseOrderId: "order-2039", senderName: "Léa Dubois", recipientName: "Marc", sendAt: null, sentAt: "2026-09-30T18:21:00Z", createdAt: "2026-09-30T18:20:00Z" },
  { id: "gc-8jq1", code: "GESTE-8JQ1-02BC", initialCents: 3000, balanceCents: 1100, purchaseOrderId: "order-2012", senderName: "Camille Martin", recipientName: "Léa", sendAt: null, sentAt: "2026-09-18T12:11:00Z", createdAt: "2026-09-18T12:10:00Z" },
  { id: "gc-1zz7", code: "GESTE-1ZZ7-77XY", initialCents: 10000, balanceCents: 10000, purchaseOrderId: "order-2030", senderName: "Paul G.", recipientName: "Anne", sendAt: "2026-12-24T08:00:00Z", sentAt: null, createdAt: "2026-09-26T18:40:00Z" },
];

/** `campaigns`: the October draft and the letters already sent. */
export interface CampaignRow {
  id: string;
  subject: string;
  bodyMd: string;
  audience: "all" | "buyers" | "never_bought";
  scheduledAt: string | null;
  sentAt: string | null;
  /** "September · N°08 is out" on the board: month + subject. */
  month: string | null;
  openRate: number | null;
  clickRate: number | null;
}

export const campaigns: CampaignRow[] = [
  { id: "camp-oct", subject: "N°10 is out, and a trick for layer 2", bodyMd: "A new Beginner work, 40×50, about 1h30. Plus: why your second layer turns grey, and how to stop it.", audience: "all", scheduledAt: null, sentAt: null, month: "October", openRate: null, clickRate: null },
  { id: "camp-sep", subject: "N°08 is out", bodyMd: "", audience: "all", scheduledAt: null, sentAt: "2026-09-08T08:00:00Z", month: "September", openRate: 52, clickRate: 6.1 },
  { id: "camp-aug", subject: "3 rules against mud", bodyMd: "", audience: "all", scheduledAt: null, sentAt: "2026-08-11T08:00:00Z", month: "August", openRate: 58, clickRate: 9.4 },
  { id: "camp-jul", subject: "Welcome to Geste", bodyMd: "", audience: "all", scheduledAt: null, sentAt: "2026-07-14T08:00:00Z", month: "July", openRate: 61, clickRate: 4.2 },
];

/** Audience sizes (newsletter_subscribers confirmed, split by purchase). */
export const AUDIENCES = [
  { key: "all" as const, label: "All subscribers", count: 1240 },
  { key: "buyers" as const, label: "Buyers only", count: 410 },
  { key: "never_bought" as const, label: "Never bought", count: 830 },
];

/** Affiliate programmes of the shopping lists (placeholders until real programmes are signed). */
export const affiliates = [
  { id: "aff-a", partner: "Art supply store A", clicks: 1412, sales: 188, ratePct: 8, earnedCents: 20100 },
  { id: "aff-b", partner: "Marketplace B", clicks: 906, sales: 97, ratePct: 4, earnedCents: 8400 },
  { id: "aff-c", partner: "Canvas maker C", clicks: 210, sales: 31, ratePct: 10, earnedCents: 3300 },
];

/** The week of Oct 5 on the social calendar. */
export const socialWeek = [
  { day: "Mon 5", posts: ["TikTok · First canvas ep. 05"] },
  { day: "Tue 6", posts: ["N°10 launch", "Newsletter"] },
  { day: "Wed 7", posts: [] },
  { day: "Thu 8", posts: ["Reel · mud in 30 s"] },
  { day: "Fri 9", posts: [] },
  { day: "Sat 10", posts: ["Story · results of the week"] },
  { day: "Sun 11", posts: ["TikTok · Sunday painting"] },
];
