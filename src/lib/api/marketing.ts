/**
 * Marketing (owner only): promo codes, gift cards, newsletter campaigns, affiliate partners, social
 * calendar. Promo codes and campaigns created or changed in this browser come from the admin overlay;
 * gift cards bought at checkout in this browser (local orders) are listed with the mock ones.
 */
import { AUDIENCES, promoCodes, type CampaignRow, type GiftCardRow, type PromoRow } from "@/data/marketing";
import { addDays, parisDay, simNowIso } from "@/lib/clock";
import { AFFILIATE_PARTNERS } from "@/sim/config";
import { giftCardEnd } from "@/lib/ledger/derive";
import { clone } from "./clone";
import { allAffiliateClicks, allAffiliateCommissions, allCampaigns, allGiftCards, allOrders, allSocialPosts, allSubscribers, merged, orderNumberOf, patched } from "./local";

export type { PromoKind, PromoScope } from "@/data/marketing";

export interface PromoCode {
  id: string;
  code: string;
  /** "−15% first guide" */
  discount: string;
  /** Where it is shared ("TikTok bio", "Not shared yet"). */
  where: string;
  uses: number;
  maxUses: number | null;
  endsAt: string | null;
  status: "Active" | "Scheduled" | "Ended";
}

/** Promo codes, the board's and those created in this browser (sync: checkout prices with them). */
export const allPromos = (): PromoRow[] => merged("promo_codes", promoCodes);

/** Uses of a code: paid orders that carry it, every source, up to `now`. */
export function promoUses(code: string, now = simNowIso()): number {
  const c = code.toUpperCase();
  return allOrders().filter((o) => o.promoCode === c && o.status !== "pending" && o.status !== "cancelled" && o.paidAt <= now).length;
}

function promoStatus(p: PromoRow, now: string): PromoCode["status"] {
  if (p.startsAt && p.startsAt > now) return "Scheduled";
  if (p.endsAt && p.endsAt < now) return "Ended";
  if (p.maxUses !== null && promoUses(p.code, now) >= p.maxUses) return "Ended";
  return "Active";
}

/** Oldest first, as on the board (a new code goes at the end). */
export async function getPromoCodes(now = simNowIso()): Promise<PromoCode[]> {
  return clone(
    merged("promo_codes", promoCodes)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((p) => ({ id: p.id, code: p.code, discount: p.label, where: p.note, uses: promoUses(p.code, now), maxUses: p.maxUses, endsAt: p.endsAt, status: promoStatus(p, now) })),
  );
}

export async function promoCodeExists(code: string): Promise<boolean> {
  return merged("promo_codes", promoCodes).some((p) => p.code === code.trim().toUpperCase());
}

export interface GiftCard {
  id: string;
  code: string;
  /** "Léa Dubois → Marc" */
  fromTo: string;
  amountCents: number;
  balanceCents: number;
  status: string;
  state: "done" | "todo";
  orderNumber: string | null;
  /** Valid until (the admin can extend it). */
  expiresAt: string;
  voided: boolean;
}

function giftStatus(g: GiftCardRow): Pick<GiftCard, "status" | "state"> {
  if (g.voidedAt) return { status: "Cancelled", state: "done" };
  if (giftCardEnd(g).at.getTime() < Date.parse(simNowIso())) return { status: "Expired", state: "done" };
  if (!g.sentAt && g.sendAt) {
    const d = new Date(g.sendAt);
    return { status: `Scheduled ${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`, state: "todo" };
  }
  if (g.balanceCents === 0) return { status: "Used", state: "done" };
  if (g.balanceCents < g.initialCents) return { status: "Partly used", state: "done" };
  return { status: "Sent, unused", state: "todo" };
}

/** Gift cards bought in this browser first, then the others newest first. */
export async function getGiftCards(): Promise<GiftCard[]> {
  const cards = allGiftCards();
  return clone(
    // This browser's cards first, then the others newest first.
    [...cards].sort((a, b) => Number(b.id.startsWith("gc-item-local")) - Number(a.id.startsWith("gc-item-local")) || b.createdAt.localeCompare(a.createdAt)).map((g) => ({
      id: g.id,
      code: g.code,
      fromTo: `${g.senderName} → ${g.recipientName ?? "by email"}`,
      amountCents: g.initialCents,
      balanceCents: g.voidedAt ? 0 : g.balanceCents,
      ...giftStatus(g),
      orderNumber: g.purchaseOrderId ? orderNumberOf(g.purchaseOrderId) : null,
      expiresAt: giftCardEnd({ ...g, voidedAt: null }).at.toISOString(),
      voided: !!g.voidedAt,
    })),
  );
}

export interface Campaign {
  id: string;
  subject: string;
  body: string;
  audience: CampaignRow["audience"];
  scheduledAt: string | null;
  sentAt: string | null;
  testSentAt: string | null;
  /** "September · N°08 is out" */
  label: string;
  openRate: number | null;
  clickRate: number | null;
}

/**
 * Newsletter audiences from the subscriber rows (subscribed, not unsubscribed, now): who bought (a paid
 * order by their account or email) and who never did. "1,240 subscribers · 412 are customers".
 */
export function audiences(now = simNowIso()): Array<{ key: CampaignRow["audience"]; label: string; count: number }> {
  const buyers = new Set<string>();
  for (const o of allOrders()) {
    if (o.status === "pending" || o.status === "cancelled" || o.paidAt > now) continue;
    buyers.add(o.userId);
    if (o.email) buyers.add(o.email.toLowerCase());
  }
  const active = allSubscribers().filter((s) => s.subscribedAt <= now && (!s.unsubscribedAt || s.unsubscribedAt > now));
  const bought = active.filter((s) => (s.customerId && buyers.has(s.customerId)) || buyers.has(s.email.toLowerCase())).length;
  return AUDIENCES.map((a) => ({ key: a.key, label: a.label, count: a.key === "all" ? active.length : a.key === "buyers" ? bought : active.length - bought }));
}

export async function getCampaigns(): Promise<{ draft: Campaign | null; past: Campaign[]; audiences: typeof AUDIENCES }> {
  const rows = (allCampaigns() as Array<CampaignRow & { testSentAt?: string | null }>).map((c) => ({
    id: c.id,
    subject: c.subject,
    body: c.bodyMd,
    audience: c.audience,
    scheduledAt: c.scheduledAt,
    sentAt: c.sentAt,
    testSentAt: c.testSentAt ?? null,
    label: `${c.month} · ${c.subject}`,
    openRate: c.openRate,
    clickRate: c.clickRate,
  }));
  // The draft: a letter neither sent nor scheduled first (the October one), else the next scheduled.
  return clone({ draft: rows.find((c) => !c.sentAt && !c.scheduledAt) ?? rows.find((c) => !c.sentAt) ?? null, past: rows.filter((c) => c.sentAt).sort((a, b) => b.sentAt!.localeCompare(a.sentAt!)), audiences: audiences() });
}

export interface AffiliatePartner {
  id: string;
  partner: string;
  ratePct: number;
  /** Link to a product with our tag: "{url}" is the product's address. */
  linkTemplate: string;
  payoutDay: number;
  clicks: number;
  sales: number;
  /** Commissions earned in the period, EUR (partners pay in euros). */
  earnedEurCents: number;
}

/**
 * Affiliate partners (Marketing › Affiliate): name, rate, link template and payout day as edited in the
 * admin; clicks, sales and commissions of the last 30 days from the affiliate rows.
 */
export async function getAffiliates(): Promise<AffiliatePartner[]> {
  const today = parisDay(simNowIso());
  const from = addDays(today, -29);
  const clicks = allAffiliateClicks().filter((d) => d.day >= from && d.day <= today);
  const sales = allAffiliateCommissions().filter((c) => parisDay(c.at) >= from && parisDay(c.at) <= today);
  return clone(
    AFFILIATE_PARTNERS.map((p) => {
      const row = patched("affiliate_partners", { id: p.id, partner: p.name, ratePct: p.ratePct, linkTemplate: `{url}?ref=geste-${p.id}`, payoutDay: p.payoutDay });
      const mine = sales.filter((c) => c.partnerId === p.id);
      return { ...row, clicks: clicks.reduce((s, d) => s + (d.clicks[p.id] ?? 0), 0), sales: mine.length, earnedEurCents: mine.reduce((s, c) => s + c.commissionCents, 0) };
    }),
  );
}

export interface SocialPost {
  id: string;
  network: "tiktok" | "instagram" | "pinterest" | "youtube";
  title: string;
  at: string;
  /** The network's figures once posted (social adapter). */
  views: number | null;
  likes: number | null;
  linkClicks: number | null;
  /** Planned in the admin: can be moved or deleted. */
  editable: boolean;
}

/**
 * Social calendar of a week (Monday → Sunday, Paris), posts from the social rows and those planned in
 * the admin; moved or deleted ones as edited.
 */
export async function getSocialWeek(monday?: string): Promise<{ monday: string; days: Array<{ day: string; label: string; posts: SocialPost[] }> }> {
  const today = parisDay(simNowIso());
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = monday ?? addDays(today, -weekday);
  const end = addDays(start, 6);
  const now = simNowIso();
  const posts: SocialPost[] = [
    ...allSocialPosts().map((p) => ({ id: p.id, network: p.network, title: p.title, at: p.at, views: p.at <= now ? p.views : null, likes: p.at <= now ? p.likes : null, linkClicks: p.at <= now ? p.linkClicks : null, editable: false })),
    ...merged<{ id: string; network: SocialPost["network"]; title: string; at: string; deleted?: boolean }>("social_posts", [])
      .filter((p) => !p.deleted)
      .map((p) => ({ id: p.id, network: p.network, title: p.title, at: p.at, views: null, likes: null, linkClicks: null, editable: true })),
  ].filter((p) => parisDay(p.at) >= start && parisDay(p.at) <= end);
  const NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return clone({
    monday: start,
    days: NAMES.map((n, i) => {
      const day = addDays(start, i);
      return { day, label: `${n} ${Number(day.slice(8, 10))}`, posts: posts.filter((p) => parisDay(p.at) === day).sort((a, b) => a.at.localeCompare(b.at)) };
    }),
  });
}
