/** Back-office team (`staff_roles` joined to profiles), and people invited in this browser. */
import { staff } from "@/data/staff";
import { securitySettings } from "@/data/settings";
import { clone } from "./clone";
import { inserted, patched } from "./local";
import type { StaffMember, StaffRole } from "./types";

interface InviteRow {
  id: string;
  email: string;
  role: StaffRole;
  at: string;
  /** Set at their first sign-in, with the authenticator app set up (2FA). */
  acceptedAt?: string | null;
}

/** Invites with their acceptance (Settings › Team "Invite +"). */
export const staffInvites = () => inserted<InviteRow>("staff_invites").map((i) => patched("staff_invites", i));

/** "marie.dupont@…" → "Marie Dupont": an invite's name until they set their own. */
const nameOf = (email: string) => email.split("@")[0]!.split(/[._-]+/).filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");

/** A team member, or someone invited: they sign in with the invite's role; 2FA is on once they accepted. */
export async function getStaffMember(query: { id?: string; email?: string }): Promise<(StaffMember & { inviteId?: string }) | null> {
  const email = query.email?.trim().toLowerCase();
  const row = staff.find((s) => (query.id !== undefined && s.id === query.id) || (email !== undefined && s.email === email));
  if (row) return clone(row);
  const invite = staffInvites().find((i) => (query.id !== undefined && `staff-invite-${i.id}` === query.id) || (email !== undefined && i.email === email));
  return invite ? clone({ id: `staff-invite-${invite.id}`, email: invite.email, fullName: nameOf(invite.email), role: invite.role, totpEnabled: !!invite.acceptedAt, inviteId: invite.id }) : null;
}

/** Settings › Security "Session timeout · 12 hours", in hours. */
export function sessionTimeoutHours(): number {
  const row = securitySettings.find((s) => s.name === "Session timeout");
  const h = Number.parseInt(row?.status ?? "", 10);
  return Number.isFinite(h) && h > 0 ? h : 12;
}

/** Has a staff session outlived the timeout? */
export const sessionExpired = (signedInAt: string, now: number, hours = sessionTimeoutHours()) => now - Date.parse(signedInAt) > hours * 3_600_000;
