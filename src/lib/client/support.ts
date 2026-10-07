"use client";

/**
 * "Contact" on /help (Help, MHelp): the future `contactSupport` server action creates a
 * `support_threads` row and its first `support_messages` row, then emails a copy (Resend). Mock:
 * nothing is sent; the thread is added to this browser's admin overlay, so it shows in
 * /admin/support here, and the page shows the board's "Message sent" line.
 */
import { findCustomerByEmail, getOrder, whenSimReady } from "@/lib/api";
import { adminNow, insertRow } from "./admin";

export interface ContactInput {
  email: string;
  /** "#GS-0000", optional. */
  orderNumber?: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactInput, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (!input.email.trim()) errors.email = "Enter your email";
  else if (!EMAIL.test(input.email.trim())) errors.email = "Enter an email like name@mail.com";
  if (!input.message.trim()) errors.message = "Write your message";
  return errors;
}

/** Returns the new thread's id. Throws the field errors when the input is invalid. */
export async function contactSupport(input: ContactInput): Promise<string> {
  // Numbers, stock and customers include the simulated history: wait for it (docs/admin-v2/01 §2).
  await whenSimReady();
  const errors = validateContact(input);
  if (Object.keys(errors).length) throw Object.assign(new Error("Invalid contact form"), { errors });
  const email = input.email.trim().toLowerCase();
  const body = input.message.trim();
  const [customer, order] = await Promise.all([findCustomerByEmail(email), input.orderNumber?.trim() ? getOrder(input.orderNumber.trim()) : null]);
  const at = adminNow();
  // Subject: the first line of the message, as the inbox lists it.
  const first = body.split("\n")[0]!.trim();
  const subject = first.length > 60 ? `${first.slice(0, 59)}…` : first;
  const thread = insertRow("support_threads", {
    userId: customer?.id ?? null, email, subject, orderId: order?.id ?? null, category: "question", status: "open", readAt: null, createdAt: at, updatedAt: at,
  });
  insertRow("support_messages", { threadId: thread.id, from: "customer", body, staffName: null, createdAt: at });
  return thread.id;
}
