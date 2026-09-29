import type { StaffRole } from "@/lib/types";
import { AdminHeadRow, AdminRow } from "./AdminUI";

/**
 * Settings › Team & roles "Permissions by role", as drawn on AdminSettings. The source of truth is
 * the database (`has_role` in the RLS policies) and docs/admin.md; keep the three in sync.
 * "Orders & refunds" is about refunding: Fulfilment reads orders to ship them (its own row).
 */
export const PERMISSIONS: Array<{ area: string; roles: StaffRole[] }> = [
  { area: "Orders & refunds", roles: ["owner", "support"] },
  { area: "Fulfilment", roles: ["owner", "fulfilment"] },
  { area: "Catalog & guides", roles: ["owner", "content"] },
  { area: "Customers & support", roles: ["owner", "support"] },
  { area: "Finance", roles: ["owner"] },
  { area: "Settings & team", roles: ["owner"] },
];

const COLS = "1.4fr repeat(4, 110px)";
const ROLES: Array<[StaffRole, string]> = [
  ["owner", "Owner"],
  ["support", "Support"],
  ["fulfilment", "Fulfilment"],
  ["content", "Content editor"],
];

/** Read-only grid: Area + one column per role, ✓ or a Stone "—" (with a text alternative). Rows 8 px apart, as drawn. */
export function PermissionMatrix() {
  return (
    <div role="table" aria-label="Permissions by role" className="flex flex-col gap-8">
      <AdminHeadRow cols={COLS}>
        <span role="columnheader">Area</span>
        {ROLES.map(([k, l]) => (
          <span key={k} role="columnheader">{l}</span>
        ))}
      </AdminHeadRow>
      {PERMISSIONS.map((p) => (
        <AdminRow key={p.area} cols={COLS}>
          <span role="rowheader">{p.area}</span>
          {ROLES.map(([k]) =>
            p.roles.includes(k) ? (
              <span key={k} role="cell">✓<span className="sr-only"> allowed</span></span>
            ) : (
              <span key={k} role="cell"><span className="text-fg-muted" aria-hidden="true">—</span><span className="sr-only">not allowed</span></span>
            ),
          )}
        </AdminRow>
      ))}
    </div>
  );
}
