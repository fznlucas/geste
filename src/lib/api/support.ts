/** Support inbox (AdminSupport): threads, messages, saved replies. */
import { savedReplies, supportMessages } from "@/data/support";
import type { SupportMessageRow, SupportThreadRow } from "@/data/types";
import { clone } from "./clone";
import { allCustomers, allOrders, allSupportThreads, merged } from "./local";
import type { SavedReply, SupportThread, SupportThreadDetail, ThreadStatus } from "./types";

/** Mock messages + replies sent from this browser, oldest first. */
const allMessages = () => merged<SupportMessageRow>("support_messages", supportMessages).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export function mapThread(row: SupportThreadRow): SupportThread {
  const messages = allMessages().filter((m) => m.threadId === row.id);
  const last = messages.filter((m) => m.from === "customer").at(-1);
  const lastCustomer = last?.createdAt ?? row.createdAt;
  return {
    id: row.id,
    subject: row.subject,
    email: row.email,
    customerId: row.userId,
    customerName: allCustomers().find((c) => c.id === row.userId)?.fullName ?? null,
    orderNumber: allOrders().find((o) => o.id === row.orderId)?.number ?? null,
    category: row.category,
    status: row.status,
    unread: row.status === "open" && (row.readAt === null || row.readAt < lastCustomer),
    lastCustomerMessage: last ? { body: last.body, at: last.createdAt } : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Customer's last message first (the inbox order of the board). */
const lastCustomerAt = (row: SupportThreadRow) => allMessages().filter((m) => m.threadId === row.id && m.from === "customer").at(-1)?.createdAt ?? row.createdAt;

/** Newest first. `unread`: only the threads staff have not opened since the customer wrote (sidebar count). */
export async function getSupportThreads(query: { status?: ThreadStatus; unread?: boolean; customerId?: string } = {}): Promise<SupportThread[]> {
  return clone(
    allSupportThreads()
      .filter((t) => !query.status || t.status === query.status)
      .filter((t) => !query.customerId || t.userId === query.customerId)
      .sort((a, b) => lastCustomerAt(b).localeCompare(lastCustomerAt(a)))
      .map(mapThread)
      .filter((t) => !query.unread || t.unread),
  );
}

export async function getSupportThread(id: string): Promise<SupportThreadDetail | null> {
  const row = allSupportThreads().find((t) => t.id === id);
  if (!row) return null;
  return clone({
    ...mapThread(row),
    messages: allMessages()
      .filter((m) => m.threadId === id)
      .map(({ id, from, body, staffName, createdAt }) => ({ id, from, body, staffName, createdAt })),
  });
}

export async function getSavedReplies(): Promise<SavedReply[]> {
  return clone(savedReplies);
}
