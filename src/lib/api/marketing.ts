/**
 * Marketing (owner only): promo codes, gift cards, newsletter campaigns, affiliate partners, social
 * calendar. Promo codes and campaigns created or changed in this browser come from the admin overlay;
 * gift cards bought at checkout in this browser (local orders) are listed with the mock ones.
 */
import { AUDIENCES, affiliates, promoCodes, socialWeek, type CampaignRow, type GiftCardRow, type PromoRow } from "@/data/marketing";
import { simNowIso } from "@/lib/clock";
import { clone } from "./clone";
import { allCampaigns, allGiftCards, allOrders, allSubscribers, merged, orderNumberOf } from "./local";

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
}

function giftStatus(g: GiftCardRow): Pick<GiftCard, "status" | "state"> {
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
      balanceCents: g.balanceCents,
      ...giftStatus(g),
      orderNumber: g.purchaseOrderId ? orderNumberOf(g.purchaseOrderId) : null,
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

export async function getAffiliates() {
  return clone(affiliates);
}

export async function getSocialWeek() {
  return clone(socialWeek);
}
