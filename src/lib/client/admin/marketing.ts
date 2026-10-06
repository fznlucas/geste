"use client";

/**
 * Marketing actions of the mock (future `src/actions/admin/marketing.ts`): createPromo, scheduleCampaign,
 * sendTest, saveCampaign. Owner only; each writes the admin overlay and the audit log.
 */
import { addDays, parisDay, startOfDayParis } from "@/lib/clock";
import { promoCodeExists, type PromoScope } from "@/lib/api";
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

/** "New promo code": code in capitals (A–Z, 0–9), unique; max uses ≥ 1 or empty; end date not in the past. */
export async function createPromo(input: { code: string; discount: PromoDiscount; scope: PromoScope; maxUses: string; endsOn: string }) {
  const staff = requireStaff("owner");
  const code = input.code.trim().toUpperCase();
  if (!code) throw new PromoError("code", "Enter a code");
  if (!/^[A-Z0-9]{3,20}$/.test(code)) throw new PromoError("code", "Letters and digits only, 3 to 20");
  if (await promoCodeExists(code)) throw new PromoError("code", "This code already exists");
  const max = input.maxUses.trim() ? Number(input.maxUses) : null;
  if (max !== null && (!Number.isInteger(max) || max < 1)) throw new PromoError("maxUses", "A whole number, 1 or more");
  const now = adminNow();
  if (input.endsOn && `${input.endsOn}T23:59:59Z` < now) throw new PromoError("endsAt", "This date is in the past");
  const amount = input.discount === "−$5";
  const value = amount ? 500 : Number(input.discount.replace(/[^0-9]/g, ""));
  const scopeLabel = input.scope === "everything" ? "" : ` ${input.scope}`;
  insertRow(
    "promo_codes",
    {
      code, kind: amount ? "amount" : "percent", value, scope: input.scope, firstOrderOnly: false, maxUses: max, uses: 0,
      startsAt: null, endsAt: input.endsOn ? `${input.endsOn}T23:59:00Z` : null, note: "Not shared yet", label: `${input.discount}${scopeLabel}`, createdAt: now,
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
