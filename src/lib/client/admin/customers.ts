"use client";

/**
 * Customer actions (future `src/actions/admin/customers.ts`): login link, print quota, GDPR export and
 * deletion. Support role (the owner passes). Each writes the audit log; nothing is sent or deleted in the mock.
 */
import { getCustomer, getOrders, type CustomerDetail } from "@/lib/api";
import { adminNow, audit, patchRow, requireStaff } from "../admin";

async function customerOrThrow(id: string): Promise<CustomerDetail> {
  const c = await getCustomer(id);
  if (!c) throw new Error("Unknown customer.");
  return c;
}

/** "Send a login link": a one-time sign-in link by email (Supabase magic link later). */
export async function sendLoginLink(customerId: string): Promise<void> {
  const staff = requireStaff("support");
  const c = await customerOrThrow(customerId);
  audit({ action: "customer.login_link", target: `profile:${customerId}`, summary: `${staff.fullName} sent a login link to ${c.fullName}` });
}

/** "Reset print quota": every guide of the customer gets its 3 prints back. */
export async function resetPrintCredits(customerId: string): Promise<void> {
  const staff = requireStaff("support");
  const c = await customerOrThrow(customerId);
  for (const item of c.library) patchRow("entitlements", item.entitlementId, { printsLeft: 3 });
  audit({ action: "customer.reset_prints", target: `profile:${customerId}`, summary: `${staff.fullName} reset the print quota of ${c.fullName}` });
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
