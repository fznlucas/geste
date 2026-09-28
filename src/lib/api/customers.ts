/** Customers (admin) with their order stats. */
import { customers } from "@/data/customers";
import { entitlements } from "@/data/entitlements";
import { orders } from "@/data/orders";
import { reviews } from "@/data/reviews";
import type { ProfileRow } from "@/data/types";
import { clone } from "./clone";
import { mapLibraryItem } from "./library";
import { mapOrder } from "./orders";
import { mapReview } from "./reviews";
import type { CustomerDetail, CustomerSegment, CustomerSummary } from "./types";

/** The store ships from France: "Abroad" is any other country. */
const HOME_COUNTRY = "FR";

function mapCustomer(row: ProfileRow): CustomerSummary {
  const paid = orders.filter((o) => o.userId === row.id && o.status !== "refunded" && o.status !== "cancelled" && o.status !== "pending");
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
  };
}

/** Most recent buyers first. */
export async function getCustomers(query: { segment?: CustomerSegment; search?: string } = {}): Promise<CustomerSummary[]> {
  const search = query.search?.trim().toLowerCase();
  return clone(
    customers
      .map(mapCustomer)
      .filter((c) => {
        switch (query.segment ?? "all") {
          case "repeat": return c.ordersCount > 1;
          case "newsletter": return c.newsletter;
          case "abroad": return c.country !== HOME_COUNTRY;
          default: return true;
        }
      })
      .filter((c) => !search || c.fullName.toLowerCase().includes(search) || c.email.toLowerCase().includes(search))
      .sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? "")),
  );
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const row = customers.find((c) => c.id === id);
  if (!row) return null;
  return clone({
    ...mapCustomer(row),
    phone: row.phone,
    address: row.defaultAddress,
    orders: orders.filter((o) => o.userId === id).map(mapOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    library: entitlements.filter((e) => e.userId === id).map(mapLibraryItem),
    reviews: reviews.filter((r) => r.userId === id).map(mapReview),
  });
}

/** Login and checkout: the account an email belongs to (case-insensitive). */
export async function findCustomerByEmail(email: string): Promise<CustomerSummary | null> {
  const wanted = email.trim().toLowerCase();
  const row = customers.find((c) => c.email === wanted);
  return row ? clone(mapCustomer(row)) : null;
}
