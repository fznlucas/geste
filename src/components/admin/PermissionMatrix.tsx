import type { StaffRole } from "@/lib/types";

export const PERMISSIONS: Array<{ area: string; roles: Record<StaffRole, "full" | "read" | "partial" | "none">; note?: string }> = [
  { area: "Dashboard", roles: { owner: "full", support: "partial", fulfilment: "partial", content: "partial" }, note: "Revenue hidden for non-owners" },
  { area: "Orders & refunds", roles: { owner: "full", support: "partial", fulfilment: "read", content: "none" }, note: "Support refunds up to $50" },
  { area: "Fulfilment & editions", roles: { owner: "full", support: "read", fulfilment: "full", content: "none" } },
  { area: "Works, guides, AI", roles: { owner: "full", support: "none", fulfilment: "none", content: "full" } },
  { area: "Customers & support", roles: { owner: "full", support: "full", fulfilment: "none", content: "none" } },
  { area: "Reviews & results", roles: { owner: "full", support: "full", fulfilment: "none", content: "full" } },
  { area: "Analytics, finance, marketing", roles: { owner: "full", support: "none", fulfilment: "none", content: "none" } },
  { area: "Content & translations", roles: { owner: "full", support: "none", fulfilment: "none", content: "full" } },
  { area: "Settings & team", roles: { owner: "full", support: "none", fulfilment: "none", content: "none" } },
];

const SIGN = { full: "✓", read: "read", partial: "partial", none: "—" } as const;
const ROLES: StaffRole[] = ["owner", "support", "fulfilment", "content"];

/** Read-only matrix shown in Settings › Team. The source of truth for RLS is supabase (has_role); keep both in sync. */
export function PermissionMatrix() {
  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">Permissions by role</caption>
      <thead>
        <tr className="border-b border-fg text-left text-fg-muted">
          <th className="w-2/5 py-8 font-normal">Area</th>
          {ROLES.map((r) => (
            <th key={r} className="w-110 py-8 font-normal capitalize">{r}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PERMISSIONS.map((p) => (
          <tr key={p.area} className="border-b border-border">
            <th scope="row" className="py-12 text-left font-normal">
              {p.area}
              {p.note && <span className="block text-fg-muted">{p.note}</span>}
            </th>
            {ROLES.map((r) => (
              <td key={r} className={p.roles[r] === "none" ? "text-fg-muted" : undefined}>{SIGN[p.roles[r]]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
