/** Settings & team (owner only). Store values changed in this browser come from the admin overlay ("site_settings"). */
import { integrations, pastAudit, paymentProviders, securitySettings, shippingZones, storeSettings } from "@/data/settings";
import { staff } from "@/data/staff";
import { formatPrice } from "@/lib/format";
import { SHIPPING } from "@/lib/pricing";
import { clone } from "./clone";
import { staffInvites } from "./staff";
import { orderNumberOf, patched } from "./local";
import type { StaffRole } from "./types";

export type { SettingStatus } from "@/data/settings";

export interface StoreSetting {
  key: string;
  label: string;
  value: string;
}

/** One Store setting now, sync (emails read the support address and the domain). */
export function storeSetting(key: string): string {
  const fallback = storeSettings.find((s) => s.key === key)?.value ?? "";
  return patched("site_settings", { id: key, value: fallback }).value;
}

export async function getStoreSettings(): Promise<StoreSetting[]> {
  return clone(storeSettings.map((s) => ({ key: s.key, label: s.label, value: patched("site_settings", { id: s.key, value: s.value }).value })));
}

/** Shipping zones with the prices checkout charges (`pricing.SHIPPING`): "from" is the cheapest carrier of the zone. */
export async function getShippingZones() {
  const from: Record<string, string> = {
    France: formatPrice(Math.min(SHIPPING.mondial_relay.cents, SHIPPING.colissimo.cents, SHIPPING.chronopost_express.cents)),
    Europe: formatPrice(SHIPPING.international.cents),
    Switzerland: formatPrice(SHIPPING.international.cents),
  };
  return clone(shippingZones.map((z) => ({ ...z, from: from[z.zone] ?? z.from })));
}
export async function getPaymentProviders() {
  return clone(paymentProviders);
}
export async function getSecuritySettings() {
  return clone(securitySettings);
}
export async function getIntegrations() {
  return clone(integrations);
}

export interface TeamMember {
  id: string;
  /** "Lucas · lucas@geste.studio", or the invited email */
  who: string;
  email: string;
  role: StaffRole;
  /** "Owner", "Support", "Content editor" */
  roleLabel: string;
  invited: boolean;
  totpEnabled: boolean;
}

export const TEAM_ROLE_LABEL: Record<StaffRole, string> = { owner: "Owner", support: "Support", fulfilment: "Fulfilment", content: "Content editor" };

/** Staff with a role, then pending invites (newest last, as on the board). */
export async function getTeam(): Promise<TeamMember[]> {
  const invites = staffInvites().slice().reverse();
  return clone([
    ...staff.map((s) => ({ id: s.id, who: `${s.fullName} · ${s.email}`, email: s.email, role: s.role, roleLabel: TEAM_ROLE_LABEL[s.role], invited: false, totpEnabled: s.totpEnabled })),
    // An invite becomes a member at their first sign-in, with 2FA set up.
    ...invites.map((i) => ({ id: i.id, who: i.acceptedAt ? `${i.email.split("@")[0]} · ${i.email}` : i.email, email: i.email, role: i.role, roleLabel: TEAM_ROLE_LABEL[i.role], invited: !i.acceptedAt, totpEnabled: !!i.acceptedAt })),
  ]);
}

/** The audit log before this browser's actions (the client lists its own entries first). */
/** "{order:order-2033}" → "#GS-1402": orders are referred to by id, numbered at read time. */
const withOrderNumbers = (text: string) => text.replace(/\{order:([^}]+)\}/g, (_, id: string) => `#${orderNumberOf(id) ?? id}`);

export async function getPastAudit() {
  return clone(pastAudit.map((a) => ({ ...a, summary: withOrderNumbers(a.summary) })));
}
