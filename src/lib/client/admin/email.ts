"use client";

/**
 * Sending an email from the admin (docs/admin-v2/03, 04): rendered by the template, sent through the
 * Resend adapter (mock: kept in Settings › Integrations › Outbox), logged. From the support address of
 * Settings › Store.
 */
import { storeSetting } from "@/lib/api";
import { call } from "@/lib/integrations";
import { renderEmail, type EmailData, type EmailTemplate } from "@/lib/integrations/resend/templates";

export async function sendEmail(template: EmailTemplate, to: string, related: string | null, data: Omit<EmailData, "domain">): Promise<void> {
  const { subject, body } = renderEmail(template, { ...data, domain: storeSetting("store.domain") });
  await call("resend", `send:${template}`, related, (a) => a.send({ to, from: storeSetting("store.support_email"), subject, template, body, related }));
}
