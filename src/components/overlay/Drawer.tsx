"use client";

import * as D from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Icon } from "../brand/Icon";
import { cn } from "@/lib/cn";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** right = cart (desktop 440 px, phone full width). left/full = phone menu. */
  side?: "right" | "full";
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Slides 100% in from its side over 420 ms (ease-standard); scrim fades to rgba(17,17,17,.24).
 * Escape and scrim click close; focus is trapped and returns to the trigger (Radix Dialog).
 */
export function Drawer({ open, onOpenChange, title, side = "right", children, footer }: DrawerProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-drawer bg-scrim data-[state=open]:animate-[fade-in_420ms_var(--ease-standard)] data-[state=closed]:animate-[fade-out_420ms_var(--ease-standard)]" />
        <D.Content
          className={cn(
            "fixed inset-y-0 right-0 z-drawer flex flex-col bg-bg outline-none",
            side === "right" ? "w-full md:w-440" : "w-full",
            "data-[state=open]:animate-[slide-in-right_420ms_var(--ease-standard)] data-[state=closed]:animate-[slide-out-right_420ms_var(--ease-standard)]",
          )}
        >
          <div className="flex min-h-56 items-center justify-between px-16 md:px-32">
            <D.Title className="text-xs font-medium">{title}</D.Title>
            <D.Close className="flex size-44 items-center justify-center hover:text-fg-muted" aria-label="Close">
              <Icon name="close" />
            </D.Close>
          </div>
          <D.Description className="sr-only">{title}</D.Description>
          <div className="flex-1 overflow-y-auto px-16 md:px-32">{children}</div>
          {footer && <div className="border-t border-border px-16 py-16 md:px-32">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
