/** Settings & team (owner only). Store values changed in this browser come from the admin overlay ("site_settings"). */
import { integrations, pastAudit, paymentProviders, securitySettings, shippingZones, storeSettings } from "@/data/settings";
import { staff } from "@/data/staff";
import { clone } from "./clone";
import { inserted, orderNumberOf, patched } from "./local";
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

export async function getShippingZones() {
  return clone(shippingZones);
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
  const invites = inserted<{ id: string; email: string; role: StaffRole; at: string }>("staff_invites").slice().reverse();
  return clone([
    ...staff.map((s) => ({ id: s.id, who: `${s.fullName} · ${s.email}`, email: s.email, role: s.role, roleLabel: TEAM_ROLE_LABEL[s.role], invited: false, totpEnabled: s.totpEnabled })),
    ...invites.map((i) => ({ id: i.id, who: i.email, email: i.email, role: i.role, roleLabel: TEAM_ROLE_LABEL[i.role], invited: true, totpEnabled: false })),
  ]);
}

/** The audit log before this browser's actions (the client lists its own entries first). */
/** "{order:order-2033}" → "#GS-1402": orders are referred to by id, numbered at read time. */
const withOrderNumbers = (text: string) => text.replace(/\{order:([^}]+)\}/g, (_, id: string) => `#${orderNumberOf(id) ?? id}`);

export async function getPastAudit() {
  return clone(pastAudit.map((a) => ({ ...a, summary: withOrderNumbers(a.summary) })));
}
