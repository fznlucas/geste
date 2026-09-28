/** `staff_roles`: the back-office team. Lucas is the owner on every admin board ("Lucas · Owner · 2FA on"). */
import type { StaffRole } from "@/lib/types";

export interface StaffRow {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  totpEnabled: boolean;
}

export const staff: StaffRow[] = [
  { id: "staff-lucas", email: "lucas@geste.studio", fullName: "Lucas", role: "owner", totpEnabled: true },
];

/** The staff member the fake admin session signs in as. */
export const DEMO_STAFF_ID = "staff-lucas";
