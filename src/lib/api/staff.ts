/** Back-office team (`staff_roles` joined to profiles). */
import { staff } from "@/data/staff";
import { clone } from "./clone";
import type { StaffMember } from "./types";

export async function getStaffMember(query: { id?: string; email?: string }): Promise<StaffMember | null> {
  const email = query.email?.trim().toLowerCase();
  const row = staff.find((s) => (query.id !== undefined && s.id === query.id) || (email !== undefined && s.email === email));
  return row ? clone(row) : null;
}
