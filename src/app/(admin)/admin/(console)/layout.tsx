import type { Metadata } from "next";
import { AdminFrame } from "../_admin/AdminFrame";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Geste admin" } };

/** Every admin page but the login: staff guard, sidebar, toasts (docs/screens/admin.md). */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
