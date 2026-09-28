/** Support inbox. */
import { customers } from "@/data/customers";
import { orders } from "@/data/orders";
import { supportThreads } from "@/data/support";
import type { SupportThreadRow } from "@/data/types";
import { clone } from "./clone";
import type { SupportThread, ThreadStatus } from "./types";

export function mapThread(row: SupportThreadRow): SupportThread {
  return {
    id: row.id,
    subject: row.subject,
    email: row.email,
    customerId: row.userId,
    customerName: customers.find((c) => c.id === row.userId)?.fullName ?? null,
    orderNumber: orders.find((o) => o.id === row.orderId)?.number ?? null,
    category: row.category,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Newest first. */
export async function getSupportThreads(query: { status?: ThreadStatus } = {}): Promise<SupportThread[]> {
  return clone(
    supportThreads
      .filter((t) => !query.status || t.status === query.status)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(mapThread),
  );
}
