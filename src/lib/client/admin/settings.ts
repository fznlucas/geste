"use client";

/**
 * Settings actions of the mock (future `src/actions/admin/settings.ts`): inviteStaff, removeStaff,
 * saveSetting. Owner only; each writes the admin overlay and the audit log.
 */
import { getTeam, TEAM_ROLE_LABEL } from "@/lib/api";
import type { StaffRole } from "@/lib/types";
import { deleteInsertedRow, insertRow, patchRow, adminNow, requireStaff } from "../admin";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "Invite +": a pending member (email + role) until they accept and set up 2FA. */
export async function inviteStaff(emailInput: string, role: Exclude<StaffRole, "owner">) {
  const staff = requireStaff("owner");
  const email = emailInput.trim().toLowerCase();
  if (!email) throw new Error("Enter an email");
  if (!EMAIL.test(email)) throw new Error("This email looks incomplete");
  if ((await getTeam()).some((m) => m.email === email)) throw new Error("Already in the team");
  insertRow("staff_invites", { email, role, at: adminNow() }, { action: "staff.invite", target: `staff:${email}`, summary: `${staff.fullName} invited ${email} as ${TEAM_ROLE_LABEL[role]}` });
}

export function removeStaff(id: string, email: string) {
  const staff = requireStaff("owner");
  deleteInsertedRow("staff_invites", id, { action: "staff.remove", target: `staff:${email}`, summary: `${staff.fullName} removed ${email} from the team` });
}

/** Store tab: saved when a field is left with a new value. */
export function saveSetting(key: string, label: string, value: string) {
  const staff = requireStaff("owner");
  patchRow("site_settings", key, { value }, { action: "settings.save", target: `setting:${key}`, summary: `${staff.fullName} changed ${label.toLowerCase()} to “${value}”` });
}
