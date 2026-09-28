/** Support inbox: two open threads (AdminSupport sidebar count), one done. */
import type { SupportThreadRow } from "./types";

export const supportThreads: SupportThreadRow[] = [
  { id: "thread-1", userId: "cus-yanis-benali", email: "yanis.benali@mail.com", subject: "Refund request for #GS-2035", orderId: "order-2035", category: "refund", status: "open", createdAt: "2026-09-30T09:10:00Z", updatedAt: "2026-09-30T09:10:00Z" },
  { id: "thread-2", userId: "cus-tom-laurent", email: "tom.laurent@mail.com", subject: "Canvas link in the shopping list is broken", orderId: "order-2037", category: "problem", status: "open", createdAt: "2026-10-01T10:00:00Z", updatedAt: "2026-10-01T10:00:00Z" },
  { id: "thread-3", userId: "cus-camille-martin", email: "camille.martin@mail.com", subject: "When will my print ship?", orderId: "order-2041", category: "question", status: "done", createdAt: "2026-10-01T18:00:00Z", updatedAt: "2026-10-01T18:30:00Z" },
];
