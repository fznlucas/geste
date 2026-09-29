/** Customers (admin) with their order stats. */
import { CUSTOMER_SOURCES } from "@/data/customers";
import { passkeys, passwordChangedAt } from "@/data/security";
import type { ProfileRow } from "@/data/types";
import { clone } from "./clone";
import { mapLibraryItem } from "./library";
import { allCustomers, allEntitlements, allOrders, allReviews } from "./local";
import { mapOrder } from "./orders";
import { mapReview } from "./reviews";
import type { AccountSecurity, CustomerDetail, CustomerSegment, CustomerSummary } from "./types";

/** The store ships from France: "Abroad" is any other country. */
const HOME_COUNTRY = "FR";

function mapCustomer(row: ProfileRow): CustomerSummary {
  const paid = allOrders().filter((o) => o.userId === row.id && o.status !== "refunded" && o.status !== "cancelled" && o.status !== "pending");
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    locale: row.locale,
    newsletter: row.newsletter,
    country: row.defaultAddress.country,
    city: row.defaultAddress.city,
    ordersCount: paid.length,
    spentCents: paid.reduce((s, o) => s + o.totalCents, 0),
    lastOrderAt: paid.map((o) => o.createdAt).sort().at(-1) ?? null,
    createdAt: row.createdAt,
    deletionScheduledAt: row.deletionScheduledAt ?? null,
  };
}

/** In the order of the AdminCustomers board (the mock table's order; newest sign-up first in the database). */
export async function getCustomers(query: { segment?: CustomerSegment; search?: string } = {}): Promise<CustomerSummary[]> {
  const search = query.search?.trim().toLowerCase();
  return clone(
    allCustomers()
      .map(mapCustomer)
      .filter((c) => {
        switch (query.segment ?? "all") {
          case "repeat": return c.ordersCount > 1;
          case "newsletter": return c.newsletter;
          case "abroad": return c.country !== HOME_COUNTRY;
          default: return true;
        }
      })
      .filter((c) => !search || c.fullName.toLowerCase().includes(search) || c.email.toLowerCase().includes(search)),
  );
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const row = allCustomers().find((c) => c.id === id);
  if (!row) return null;
  return clone({
    ...mapCustomer(row),
    phone: row.phone,
    address: row.defaultAddress,
    orders: allOrders().filter((o) => o.userId === id).map(mapOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    // Newest purchase first; within one order, guides in progress or not started before finished ones.
    library: allEntitlements()
      .filter((e) => e.userId === id)
      .map(mapLibraryItem)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || Number(a.state === "finished") - Number(b.state === "finished")),
    reviews: allReviews().filter((r) => r.userId === id).map(mapReview),
    source: CUSTOMER_SOURCES[id] ?? null,
    passkeyDevices: passkeys.filter((p) => p.userId === id).map((p) => p.device),
  });
}

/** Login and checkout: the account an email belongs to (case-insensitive). */
export async function findCustomerByEmail(email: string): Promise<CustomerSummary | null> {
  const wanted = email.trim().toLowerCase();
  const row = allCustomers().find((c) => c.email === wanted);
  return row ? clone(mapCustomer(row)) : null;
}

/** Settings › Password and Passkeys. Mock: without a row, the password dates from the account's creation. */
export async function getAccountSecurity(customerId: string): Promise<AccountSecurity | null> {
  const row = allCustomers().find((c) => c.id === customerId);
  if (!row) return null;
  return clone({
    passwordChangedAt: passwordChangedAt[customerId] ?? row.createdAt,
    passkeys: passkeys.filter((p) => p.userId === customerId).map(({ id, device, addedAt }) => ({ id, device, addedAt })),
  });
}
