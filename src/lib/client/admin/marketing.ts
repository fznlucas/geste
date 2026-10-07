"use client";

/**
 * Marketing actions of the mock (future `src/actions/admin/marketing.ts`): createPromo, scheduleCampaign,
 * sendTest, saveCampaign. Owner only; each writes the admin overlay and the audit log.
 */
import { addDays, parisDay, startOfDayParis } from "@/lib/clock";
import { getGiftCards, getOrder, promoCodeExists, type PromoScope } from "@/lib/api";
import { adminNow, audit, insertRow, patchRow, requireStaff } from "../admin";
import { sendEmail } from "./email";

export const PROMO_DISCOUNTS = ["−10%", "−15%", "−20%", "−$5"] as const;
export type PromoDiscount = (typeof PROMO_DISCOUNTS)[number];
export const PROMO_SCOPES: Array<{ value: PromoScope; label: string }> = [
  { value: "guides", label: "Guides" },
  { value: "prints", label: "Prints" },
  { value: "everything", label: "Everything" },
];

export class PromoError extends Error {
  constructor(
    public field: "code" | "maxUses" | "endsAt",
    message: string,
  ) {
    super(message);
  }
}

/**
 * "New promo code": code in capitals (A–Z, 0–9), unique; max uses ≥ 1 or empty; start and end dates
 * (Paris days, the end not in the past and not before the start); first order only.
 */
export async function createPromo(input: { code: string; discount: PromoDiscount; scope: PromoScope; maxUses: string; endsOn: string; startsOn?: string; firstOrderOnly?: boolean }) {
  const staff = requireStaff("owner");
  const code = input.code.trim().toUpperCase();
  if (!code) throw new PromoError("code", "Enter a code");
  if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new PromoError("code", "Letters and digits only, 3 to 20");
  if (await promoCodeExists(code)) throw new PromoError("code", "This code already exists");
  const max = input.maxUses.trim() ? Number(input.maxUses) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1)) throw new PromoError("maxUses", "A whole number, 1 or more");
  const now = adminNow();
  if (input.endsOn && `${input.endsOn}T23:59:59Z` < now) throw new PromoError("endsAt", "This date is in the past");
  if (input.startsOn && input.endsOn && input.startsOn > input.endsOn) throw new PromoError("endsAt", "Ends before it starts");
  // Paris days: from midnight of the start day to the last second of the end day.
  const startsAt = input.startsOn ? startOfDayParis(input.startsOn).toISOString() : null;
  const endsAt = input.endsOn ? new Date(startOfDayParis(addDays(input.endsOn, 1)).getTime() - 1000).toISOString() : null;
  const amount = input.discount === "−$5";
  const value = amount ? 500 : Number(input.discount.replace(/[^0-9]/g, ""));
  const scopeLabel = input.scope === "everything" ? "" : ` ${input.scope}`;
  insertRow(
    "promo_codes",
    {
      code, kind: amount ? "amount" : "percent", value, scope: input.scope, firstOrderOnly: !!input.firstOrderOnly, maxUses: max,
      startsAt, endsAt, note: "Not shared yet", label: `${input.discount}${scopeLabel}${input.firstOrderOnly ? " · first order" : ""}`, createdAt: now,
    },
    { action: "promo.create", target: `promo:${code}`, summary: `${staff.fullName} created the code ${code} (${input.discount}${scopeLabel})` },
  );
  return code;
}

export function saveCampaign(id: string, changes: { subject?: string; bodyMd?: string; audience?: "all" | "buyers" | "never_bought" }) {
  requireStaff("owner");
  patchRow("campaigns", id, changes);
}

/** "Send a test": the draft goes to the signed-in owner only. Mock: nothing is sent. */
export function sendTest(id: string, subject: string, body = "") {
  const staff = requireStaff("owner");
  patchRow("campaigns", id, { testSentAt: adminNow() }, { action: "campaign.test", target: `campaign:${id}`, summary: `${staff.fullName} sent a test of “${subject}” to ${staff.email}` });
  void sendEmail("newsletter_test", staff.email, `campaign:${id}`, { subject, body });
}

/** "Schedule for Tuesday": next Tuesday 9:00 in Paris (summer or winter time) after the mock's now. */
export function scheduleCampaign(id: string, subject: string, audienceLabel: string) {
  const staff = requireStaff("owner");
  const today = parisDay(adminNow());
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const days = ((2 - weekday + 7) % 7) || 7;
  const at = new Date(startOfDayParis(addDays(today, days)).getTime() + 9 * 3_600_000);
  patchRow("campaigns", id, { scheduledAt: at.toISOString() }, { action: "campaign.schedule", target: `campaign:${id}`, summary: `${staff.fullName} scheduled “${subject}” for Tue 9:00 · ${audienceLabel}` });
  return at.toISOString();
}

export function unscheduleCampaign(id: string, subject: string) {
  const staff = requireStaff("owner");
  patchRow("campaigns", id, { scheduledAt: null }, { action: "campaign.unschedule", target: `campaign:${id}`, summary: `${staff.fullName} cancelled the sending of “${subject}”` });
}

/** Finance "Export for accountant (CSV)": the download itself is done by the page. */
export function exportForAccountant(month: string) {
  const staff = requireStaff("owner");
  audit({ action: "finance.export", target: `finance:${month}`, summary: `${staff.fullName} exported the ${month} accounts (CSV)` });
}

/** Gift cards (Marketing › Gift cards): send the email again (Outbox), cancel what is left, extend the validity. */
export async function resendGiftCard(id: string): Promise<void> {
  const staff = requireStaff("owner");
  const g = (await getGiftCards()).find((x) => x.id === id);
  if (!g) throw new Error("Unknown gift card.");
  // To whoever bought it (the recipient's address is not kept on the mock cards).
  const order = g.orderNumber ? await getOrder(g.orderNumber) : null;
  if (!order) throw new Error("No email for this card: it was not bought on the store.");
  await sendEmail("gift_card", order.customer.email, `gift_card:${id}`, { firstName: order.customer.fullName.split(" ")[0], code: g.code, amountLabel: `$${g.amountCents / 100}` });
  audit({ action: "gift_card.resend", target: `gift_card:${id}`, summary: `${staff.fullName} sent the gift card ${g.code} again` });
}

/** "Cancel": what is left on the card stops being owed (it becomes turnover, breakage); it can no longer pay. */
export async function voidGiftCard(id: string): Promise<void> {
  const staff = requireStaff("owner");
  const g = (await getGiftCards()).find((x) => x.id === id);
  if (!g) throw new Error("Unknown gift card.");
  if (g.voided) return;
  patchRow("gift_cards", id, { voidedAt: adminNow() }, { action: "gift_card.void", target: `gift_card:${id}`, summary: `${staff.fullName} cancelled the gift card ${g.code} ($${g.balanceCents / 100} left)` });
}

/** "Extend": one more year of validity from its current end. */
export async function extendGiftCard(id: string): Promise<string> {
  const staff = requireStaff("owner");
  const g = (await getGiftCards()).find((x) => x.id === id);
  if (!g) throw new Error("Unknown gift card.");
  if (g.voided) throw new Error("This gift card was cancelled.");
  const end = new Date(g.expiresAt);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  patchRow("gift_cards", id, { expiresAt: end.toISOString() }, { action: "gift_card.extend", target: `gift_card:${id}`, summary: `${staff.fullName} extended the gift card ${g.code} to ${end.toISOString().slice(0, 10)}` });
  return end.toISOString();
}

/** Affiliate › Edit: a partner's name, rate (for commissions from now on), link template and payout day. */
export function savePartner(id: string, changes: { partner: string; ratePct: number; linkTemplate: string; payoutDay: number }) {
  const staff = requireStaff("owner");
  if (!changes.partner.trim()) throw new Error("Enter the partner's name");
  if (!Number.isFinite(changes.ratePct) || changes.ratePct <= 0 || changes.ratePct > 50) throw new Error("A rate between 0 and 50 %");
  if (!changes.linkTemplate.includes("{url}")) throw new Error("The link needs {url} where the product's address goes");
  if (!Number.isInteger(changes.payoutDay) || changes.payoutDay < 1 || changes.payoutDay > 28) throw new Error("A payout day from 1 to 28");
  patchRow("affiliate_partners", id, { ...changes, partner: changes.partner.trim() }, { action: "affiliate.edit", target: `affiliate:${id}`, summary: `${staff.fullName} edited the partner ${changes.partner.trim()} (${changes.ratePct} %, day ${changes.payoutDay})` });
}

const NETWORKS = { tiktok: "TikTok", instagram: "Instagram", pinterest: "Pinterest", youtube: "YouTube" } as const;

/** Social calendar: plan a post on a day (18:00 Paris), move it to another day, delete it. */
export function addSocialPost(day: string, network: keyof typeof NETWORKS, title: string): void {
  const staff = requireStaff("owner");
  if (!title.trim()) throw new Error("Give the post a title");
  insertRow("social_posts", { network, title: title.trim(), at: new Date(startOfDayParis(day).getTime() + 18 * 3_600_000).toISOString() }, { action: "social.add", target: "social_posts", summary: `${staff.fullName} planned “${title.trim()}” on ${NETWORKS[network]} · ${day}` });
}

export function moveSocialPost(id: string, title: string, day: string): void {
  const staff = requireStaff("owner");
  patchRow("social_posts", id, { at: new Date(startOfDayParis(day).getTime() + 18 * 3_600_000).toISOString() }, { action: "social.move", target: `social:${id}`, summary: `${staff.fullName} moved “${title}” to ${day}` });
}

export function deleteSocialPost(id: string, title: string): void {
  const staff = requireStaff("owner");
  patchRow("social_posts", id, { deleted: true }, { action: "social.delete", target: `social:${id}`, summary: `${staff.fullName} removed “${title}” from the calendar` });
}
