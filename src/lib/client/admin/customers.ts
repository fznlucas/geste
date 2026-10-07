"use client";

/**
 * Customer actions (future `src/actions/admin/customers.ts`): login link, print quota, GDPR export and
 * deletion. Support role (the owner passes). Each writes the audit log; nothing is sent or deleted in the mock.
 */
import { getCustomer, getOrders, type CustomerDetail } from "@/lib/api";
import { adminNow, audit, patchRow, requireStaff } from "../admin";
import { sendEmail } from "./email";

async function customerOrThrow(id: string): Promise<CustomerDetail> {
  const c = await getCustomer(id);
  if (!c) throw new Error("Unknown customer.");
  return c;
}

/** "Send a login link": a one-time sign-in link by email (Supabase magic link later). */
export async function sendLoginLink(customerId: string): Promise<void> {
  const staff = requireStaff("support");
  const c = await customerOrThrow(customerId);
  await sendEmail("login_link", c.email, `profile:${customerId}`, { firstName: c.fullName.split(" ")[0] });
  audit({ action: "customer.login_link", target: `profile:${customerId}`, summary: `${staff.fullName} sent a login link to ${c.fullName}` });
}

/** "Reset print quota": the chosen guide gets its 3 prints back (every guide when none is chosen). */
export async function resetPrintCredits(customerId: string, entitlementId?: string): Promise<void> {
  const staff = requireStaff("support");
  const c = await customerOrThrow(customerId);
  const items = c.library.filter((i) => !entitlementId || i.entitlementId === entitlementId);
  if (!items.length) throw new Error("This guide is not in the library.");
  for (const item of items) patchRow("entitlements", item.entitlementId, { printsLeft: 3 });
  audit({ action: "customer.reset_prints", target: `profile:${customerId}`, summary: `${staff.fullName} reset the print quota of ${c.fullName}${entitlementId ? ` · ${items[0]!.work.number}` : ""}` });
}

/** Cancels a scheduled deletion (the customer changed their mind before the 30 days). */
export async function cancelDeletion(customerId: string): Promise<void> {
  const staff = requireStaff("support");
  const c = await customerOrThrow(customerId);
  if (!c.deletionScheduledAt) return;
  patchRow("profiles", customerId, { deletionScheduledAt: null }, { action: "customer.delete_cancelled", target: `profile:${customerId}`, summary: `${staff.fullName} cancelled the deletion of ${c.fullName}'s account` });
}

/**
 * GDPR export: everything the store holds about the customer (profile, orders, library, reviews). Emailed to
 * the customer in production; the mock also returns it so the admin can download it.
 */
export async function exportCustomerData(customerId: string): Promise<Record<string, unknown>> {
  const staff = requireStaff("support");
  const c = await customerOrThrow(customerId);
  const orders = await getOrders({ customerId });
  audit({ action: "customer.export", target: `profile:${customerId}`, summary: `${staff.fullName} exported the data of ${c.fullName}` });
  const { library, reviews, ...profile } = c;
  return { exportedAt: adminNow(), profile: { ...profile, orders: undefined }, orders, library, reviews };
}

/** GDPR deletion, after two clicks: scheduled 30 days ahead (the customer can still cancel by email). */
export async function scheduleDeletion(customerId: string): Promise<void> {
  const staff = requireStaff("support");
  const c = await customerOrThrow(customerId);
  if (c.deletionScheduledAt) return;
  patchRow("profiles", customerId, { deletionScheduledAt: adminNow() }, {
    action: "customer.delete_scheduled",
    target: `profile:${customerId}`,
    summary: `${staff.fullName} scheduled the deletion of ${c.fullName}'s account`,
  });
}
