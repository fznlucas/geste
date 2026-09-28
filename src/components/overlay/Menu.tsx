"use client";

import * as M from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
}

export function Menu({ trigger, items }: { trigger: ReactNode; items: MenuItem[] }) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={8} className="z-popover min-w-200 bg-surface py-4 shadow-pop">
          {items.map((it) => (
            <M.Item
              key={it.label}
              onSelect={it.onSelect}
              asChild={!!it.href}
              className={`flex min-h-40 cursor-pointer items-center px-14 outline-none data-[highlighted]:bg-surface-muted ${it.danger ? "text-danger" : "text-fg"}`}
            >
              {it.href ? <a href={it.href}>{it.label}</a> : <span>{it.label}</span>}
            </M.Item>
          ))}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
