"use client";

import * as P from "@radix-ui/react-popover";
import type { ReactNode } from "react";

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  width?: number;
}

/** White panel, shadow-pop, no border, 8 px from its trigger. Admin alerts, account shortcuts. */
export function Popover({ trigger, children, align = "end", width = 380 }: PopoverProps) {
  return (
    <P.Root>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content align={align} sideOffset={8} className="z-popover bg-surface shadow-pop outline-none data-[state=open]:animate-[fade-in_150ms_var(--ease-standard)]" style={{ width }}>
          {children}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
