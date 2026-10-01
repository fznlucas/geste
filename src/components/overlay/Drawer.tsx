"use client";

import * as D from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useReturnFocus } from "./useReturnFocus";
import { cn } from "@/lib/cn";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name. Shown in the header ("Cart (2)") unless `header` replaces it. */
  title: string;
  /** Visible header content instead of the title (the phone menu shows the logo). */
  header?: ReactNode;
  /** right = cart (desktop 440 px, phone full width). full = phone menu. */
  side?: "right" | "full";
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Slides 100% in from its side over 420 ms (ease-standard); scrim fades to rgba(17,17,17,.24).
 * Escape and scrim click close; focus is trapped and returns to the trigger (Radix Dialog).
 * Header: title left, "Close" text right (underlined on the cart, plain on the menu — boards Cart, MMenu).
 */
export function Drawer({ open, onOpenChange, title, header, side = "right", children, footer }: DrawerProps) {
  const right = side === "right";
  const focus = useReturnFocus();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-drawer bg-scrim data-[state=open]:animate-[fade-in_420ms_var(--ease-standard)] data-[state=closed]:animate-[fade-out_420ms_var(--ease-standard)]" />
        <D.Content
          aria-describedby={undefined}
          {...focus}
          className={cn(
            "fixed inset-y-0 right-0 z-drawer flex flex-col bg-bg outline-none",
            right ? "w-full md:w-440" : "w-full",
            "data-[state=open]:animate-[slide-in-right_420ms_var(--ease-standard)] data-[state=closed]:animate-[slide-out-right_420ms_var(--ease-standard)]",
          )}
        >
          <div className={right ? "flex min-h-44 items-center justify-between px-16 pt-20 md:px-32" : "flex items-center justify-between py-4 pl-16 pr-4"}>
            {header ?? <D.Title className="font-medium tracking-normal">{title}</D.Title>}
            <D.Close className={cn("flex min-h-44 items-center hover:text-fg-muted", right ? "underline underline-offset-3" : "min-w-68 justify-center px-12")}>Close</D.Close>
          </div>
          {header && <D.Title className="sr-only">{title}</D.Title>}
          <div className={cn("flex flex-1 flex-col overflow-y-auto", right && "px-16 pb-32 pt-24 md:px-32")}>{children}</div>
          {footer && <div className="border-t border-border px-16 py-16 md:px-32">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
