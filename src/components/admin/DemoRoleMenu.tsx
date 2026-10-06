"use client";

import * as M from "@radix-ui/react-dropdown-menu";
import type { StaffRole } from "@/lib/types";
import { ROLE_LABEL } from "./AdminShell";

const ROLES: Array<[StaffRole, string]> = [
  ["owner", "Everything, revenue included"],
  ["support", "Orders, refunds ≤ $50, customers, support, reviews"],
  ["fulfilment", "Orders, fulfilment, print editions"],
  ["content", "Works, guides, AI, reviews, content"],
];

export interface DemoRoleMenuProps {
  role: StaffRole;
  onRoleChange: (role: StaffRole) => void;
  /** "Reset demo data": forgets the admin's changes and the purchases made in this browser. */
  onReset?: () => void;
  /** "Simulated data · generated up to 14:32" (docs/admin-v2/01 §7). */
  simulatedUpTo?: string;
  /** Link to Settings › Simulation. */
  simulationHref?: string;
}

/**
 * The top bar's "Demo data" chip (Mist, Stone), drawn on every admin board. In the mock it opens the
 * role switch: the same admin seen as Owner, Support, Fulfilment or Content, so each role's
 * navigation and permissions can be tried (docs/decisions.md "Admin (M6)").
 */
export function DemoRoleMenu({ role, onRoleChange, onReset, simulatedUpTo, simulationHref }: DemoRoleMenuProps) {
  return (
    <M.Root>
      <M.Trigger
        className="inline-flex cursor-pointer items-center bg-surface-muted px-8 py-4 font-mono text-xs text-fg-muted hover:text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg data-[state=open]:text-fg"
        aria-label={`Demo data · viewing as ${ROLE_LABEL[role]}`}
      >
        Demo data
      </M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={8} className="z-popover flex w-320 flex-col bg-surface py-8 shadow-pop outline-none">
          <M.Label className="px-16 pb-4 pt-4 text-fg-muted">View the admin as</M.Label>
          <M.RadioGroup value={role} onValueChange={(v) => onRoleChange(v as StaffRole)}>
            {ROLES.map(([key, what]) => (
              <M.RadioItem
                key={key}
                value={key}
                className="flex min-h-52 cursor-pointer items-center gap-10 px-16 outline-none data-[highlighted]:bg-surface-hover"
              >
                <span aria-hidden="true" className={`inline-block size-8 shrink-0 rounded-full border border-fg ${key === role ? "bg-fg" : ""}`} />
                <span className="flex flex-col">
                  <span>{ROLE_LABEL[key]}</span>
                  <span className="text-fg-muted">{what}</span>
                </span>
              </M.RadioItem>
            ))}
          </M.RadioGroup>
          {simulatedUpTo && (
            <>
              <M.Separator className="my-8 h-px bg-border" />
              <M.Label className="px-16 pb-4 pt-4 text-fg-muted">Simulated data · generated up to {simulatedUpTo}</M.Label>
              {simulationHref && (
                <M.Item asChild>
                  <a href={simulationHref} className="flex min-h-44 cursor-pointer items-center px-16 text-fg-muted outline-none data-[highlighted]:bg-surface-hover data-[highlighted]:text-fg">
                    Simulation settings
                  </a>
                </M.Item>
              )}
            </>
          )}
          {onReset && (
            <>
              <M.Separator className="my-8 h-px bg-border" />
              <M.Item onSelect={onReset} className="flex min-h-44 cursor-pointer items-center px-16 text-fg-muted outline-none data-[highlighted]:bg-surface-hover data-[highlighted]:text-fg">
                Reset demo data
              </M.Item>
            </>
          )}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
