/** Settings & team (AdminSettings): store settings, shipping zones, payment and integration status, security, past audit lines. */

/** `site_settings` keys of the Store tab, with their values. */
export const storeSettings = [
  { key: "store.name", label: "Store name", value: "Geste Studio" },
  { key: "store.domain", label: "Domain", value: "geste.studio" },
  { key: "store.currency", label: "Currency", value: "USD $" },
  { key: "store.languages", label: "Languages", value: "English · French (switch in footer)" },
  { key: "store.support_email", label: "Support email", value: "hello@geste.studio" },
  { key: "store.legal_entity", label: "Legal entity", value: "[Your name, micro-entreprise, SIRET]" },
  { key: "store.pickup", label: "Carrier pickup", value: "Colissimo · 16:00" },
];

export type SettingStatus = "on" | "todo" | "off";

export const shippingZones = [
  { zone: "France", carriers: "Colissimo · Mondial Relay · Chronopost", from: "$4", status: "Live", state: "on" as SettingStatus },
  { zone: "Europe", carriers: "Colissimo international", from: "$12", status: "Live", state: "on" as SettingStatus },
  { zone: "Switzerland", carriers: "Colissimo (customs)", from: "$18", status: "Duties to check", state: "todo" as SettingStatus },
  { zone: "World", carriers: "—", from: "—", status: "Off", state: "off" as SettingStatus },
];

export const paymentProviders = [
  { name: "Stripe · cards, Apple Pay, Google Pay", status: "Connected", state: "on" as SettingStatus, action: "Manage" },
  { name: "PayPal", status: "Connected", state: "on" as SettingStatus, action: "Manage" },
  { name: "Klarna · pay in 3", status: "Not connected", state: "todo" as SettingStatus, action: "Connect" },
  { name: "Tax · OSS registration", status: "To do", state: "todo" as SettingStatus, action: "Open guide" },
];

export const securitySettings = [
  { name: "Two-factor authentication (authenticator app)", status: "On for all admins" },
  { name: "Admin login with passkey", status: "On" },
  { name: "Session timeout", status: "12 hours" },
  { name: "Backups", status: "Daily, 30 days kept" },
];

export const integrations = [
  { name: "Email sending (transactional + newsletter)", status: "Connected", state: "on" as SettingStatus, action: "Settings" },
  { name: "Analytics (privacy-friendly)", status: "Connected", state: "on" as SettingStatus, action: "Settings" },
  { name: "Video hosting with DRM", status: "Not connected", state: "todo" as SettingStatus, action: "Connect" },
  { name: "Accounting export", status: "CSV only", state: "todo" as SettingStatus, action: "Connect" },
  { name: "GPU provider (AI pipeline)", status: "Budget $80/mo", state: "on" as SettingStatus, action: "Settings" },
];

/**
 * `audit_log` before this browser's own actions: the board's four lines, dated like the mock rows they
 * describe (order-2033 shipped Sept 29, order-2025 refunded Sept 24: docs/decisions.md). Orders are
 * referred to by id, `{order:<id>}`: their number is given at read time (docs/admin-v2/01 §2).
 */
export const pastAudit = [
  { id: "audit-mock-4", at: "2026-10-02T09:02:00Z", summary: "Lucas edited guide N°03 step 2c (v4)" },
  { id: "audit-mock-3", at: "2026-10-01T08:15:00Z", summary: "Login from Lyon · Mac · passkey" },
  { id: "audit-mock-2", at: "2026-09-29T16:00:00Z", summary: "Lucas marked {order:order-2033} as shipped" },
  { id: "audit-mock-1", at: "2026-09-24T17:00:00Z", summary: "Lucas refunded {order:order-2025} · $25" },
];
