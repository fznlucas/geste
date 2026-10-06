/**
 * The emails the app sends, as the Outbox shows them (React Email components later, docs/copy-and-emails.md):
 * subject and plain-text body. The sender is the support address of Settings › Store, links use its domain.
 */
export type EmailTemplate =
  | "receipt" | "library_access" | "shipping" | "refund" | "support_reply" | "login_link" | "newsletter_test" | "invite" | "gift_card" | "supplier_reorder" | "data_export";

export interface EmailData {
  firstName?: string;
  orderNumber?: string;
  totalLabel?: string;
  trackingNo?: string;
  carrier?: string;
  amountLabel?: string;
  reason?: string;
  body?: string;
  subject?: string;
  role?: string;
  domain: string;
}

export function renderEmail(template: EmailTemplate, d: EmailData): { subject: string; body: string } {
  const hi = `Hi ${d.firstName ?? "there"},`;
  const sign = "— Lucas, Geste";
  switch (template) {
    case "receipt":
      return { subject: `Your receipt · order #${d.orderNumber}`, body: `${hi}\n\nThank you for your order #${d.orderNumber} (${d.totalLabel}). Your guides are in your library: https://${d.domain}/account\n\n${sign}` };
    case "library_access":
      return { subject: "Your guides are in your library", body: `${hi}\n\nOpen your library to paint: https://${d.domain}/account\nThe link signs you in on this device.\n\n${sign}` };
    case "shipping":
      return { subject: `Your print is on its way · #${d.orderNumber}`, body: `${hi}\n\nYour signed print left the studio with ${d.carrier}. Track it: https://${d.domain}/track?order=${d.orderNumber}\nTracking number: ${d.trackingNo}\n\n${sign}` };
    case "refund":
      return { subject: `Refund of ${d.amountLabel} · order #${d.orderNumber}`, body: `${hi}\n\nI have refunded ${d.amountLabel} (${d.reason}). It shows on your card in 3 to 5 days.\n\n${sign}` };
    case "support_reply":
      return { subject: `Re: ${d.subject}`, body: d.body ?? "" };
    case "login_link":
      return { subject: "Your login link", body: `${hi}\n\nSign in to Geste: https://${d.domain}/login?code=sent\nThe link works for 15 minutes.\n\n${sign}` };
    case "newsletter_test":
      return { subject: `[Test] ${d.subject}`, body: d.body ?? "" };
    case "invite":
      return { subject: "You are invited to the Geste admin", body: `Hello,\n\nLucas invited you to the Geste admin as ${d.role}. Accept and set up two-factor sign-in: https://${d.domain}/admin/login\n\n${sign}` };
    case "gift_card":
      return { subject: "A Geste gift card for you", body: `${hi}\n\nSomeone sent you a gift card: ${d.amountLabel}. Use it at checkout on https://${d.domain}\n\n${sign}` };
    case "supplier_reorder":
      return { subject: `Reorder · ${d.subject}`, body: d.body ?? "" };
    case "data_export":
      return { subject: "Your Geste data", body: `${hi}\n\nHere is everything Geste keeps about you (attached, JSON).\n\n${sign}` };
  }
}
