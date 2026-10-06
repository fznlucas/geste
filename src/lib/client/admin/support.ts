"use client";

/**
 * Support actions (future `src/actions/admin/support.ts`): reply, setThreadStatus, plus opening a
 * thread (marks it read) and writing first to a customer ("Reply privately" on a review).
 */
import { getCustomer, getSupportThread } from "@/lib/api";
import { adminNow, insertRow, patchRow, requireStaff } from "../admin";
import { sendEmail } from "./email";

const ROLES = ["support"] as const;

/** Sends a reply by email (Resend adapter; mock: the Outbox) and keeps it in the thread. */
export async function reply(threadId: string, body: string) {
  const staff = requireStaff([...ROLES]);
  const text = body.trim();
  if (!text) throw new Error("Write a reply first.");
  const thread = await getSupportThread(threadId);
  if (!thread) throw new Error("This conversation no longer exists.");
  const at = adminNow();
  insertRow("support_messages", { threadId, from: "staff", body: text, staffName: staff.fullName, createdAt: at }, {
    action: "support.reply",
    target: `thread:${threadId}`,
    summary: `${staff.fullName} replied to ${thread.customerName ?? thread.email}`,
  });
  patchRow("support_threads", threadId, { updatedAt: at, readAt: at });
  await sendEmail("support_reply", thread.email, `thread:${threadId}`, { subject: thread.subject, body: text });
}

/** "Mark as done" / "Reopen". */
export async function setThreadStatus(threadId: string, status: "open" | "done") {
  const staff = requireStaff([...ROLES]);
  const thread = await getSupportThread(threadId);
  if (!thread) throw new Error("This conversation no longer exists.");
  const at = adminNow();
  patchRow("support_threads", threadId, { status, updatedAt: at, readAt: at }, {
    action: status === "done" ? "support.done" : "support.reopen",
    target: `thread:${threadId}`,
    summary: `${staff.fullName} ${status === "done" ? "closed" : "reopened"} “${thread.subject}” (${thread.customerName ?? thread.email})`,
  });
}

/** Opening a thread in the inbox: it no longer counts as new. Not audited (a read). */
export function markThreadRead(threadId: string) {
  requireStaff([...ROLES]);
  patchRow("support_threads", threadId, { readAt: adminNow() });
}

/** First message to a customer who has no thread yet. Returns the new thread's id. */
export async function startThread(customerId: string, subject: string, body: string): Promise<string> {
  const staff = requireStaff([...ROLES]);
  const text = body.trim();
  if (!text) throw new Error("Write a reply first.");
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error("This customer no longer exists.");
  const at = adminNow();
  const thread = insertRow("support_threads", {
    userId: customer.id, email: customer.email, subject, orderId: null, category: "question", status: "open", readAt: at, createdAt: at, updatedAt: at,
  });
  insertRow("support_messages", { threadId: thread.id, from: "staff", body: text, staffName: staff.fullName, createdAt: at }, {
    action: "support.reply",
    target: `thread:${thread.id}`,
    summary: `${staff.fullName} wrote to ${customer.fullName}`,
  });
  await sendEmail("support_reply", customer.email, `thread:${thread.id}`, { subject, body: text });
  return thread.id;
}
