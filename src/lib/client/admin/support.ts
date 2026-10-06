"use client";

/**
 * Support actions (future `src/actions/admin/support.ts`): reply, setThreadStatus, plus opening a
 * thread (marks it read) and writing first to a customer ("Reply privately" on a review).
 */
import { findGuide, getCustomer, getGuide, getOrder, getSupportThread, type FormatKey } from "@/lib/api";
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

/** "Save as a saved reply": the draft becomes a saved reply ("{name}" for the customer's first name). */
export async function saveReply(name: string, body: string): Promise<void> {
  const staff = requireStaff([...ROLES]);
  const label = name.trim(), text = body.trim();
  if (!label || !text) throw new Error("Write the reply first.");
  insertRow("saved_replies", { name: label, body: text }, { action: "support.saved_reply", target: "saved_replies", summary: `${staff.fullName} saved the reply “${label}”` });
}

/** Removes a saved reply (the board's or one saved here). */
export async function deleteReply(id: string, name: string): Promise<void> {
  const staff = requireStaff([...ROLES]);
  patchRow("saved_replies", id, { deleted: true }, { action: "support.saved_reply_delete", target: `saved_reply:${id}`, summary: `${staff.fullName} removed the saved reply “${name}”` });
}

/**
 * "Switch the guide": the customer bought the wrong canvas; their library now holds the same work and
 * level on another canvas (same price band, no refund). The reader opens the new guide.
 */
export async function swapGuideFormat(orderNumber: string, itemId: string, format: FormatKey): Promise<string> {
  const staff = requireStaff([...ROLES]);
  const order = await getOrder(orderNumber);
  const item = order?.items.find((i) => i.id === itemId);
  if (!order || !item || item.kind !== "guide" || !item.entitlementId || !item.workId) throw new Error("This guide is no longer in the order.");
  if (item.accessRevoked) throw new Error("This guide was refunded.");
  const current = item.guideId ? await getGuide(item.guideId) : null;
  const target = current ? await findGuide(item.workId, format, current.level) : null;
  if (!current || !target) throw new Error("This canvas has no guide for this work.");
  if (target.id === current.id) return target.formatLabel;
  patchRow("entitlements", item.entitlementId, { guideId: target.id }, {
    action: "support.guide_swap",
    target: `order:${order.number}`,
    summary: `${staff.fullName} switched ${order.customer.fullName}’s ${current.workNumber} guide from ${current.formatLabel} to ${target.formatLabel}`,
  });
  patchRow("order_items", item.id, { guideId: target.id, config: { ...item.config, format } });
  return target.formatLabel;
}
