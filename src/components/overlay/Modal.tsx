"use client";

import * as D from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useReturnFocus } from "./useReturnFocus";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /**
   * danger = destructive confirm (refund, delete): title stays Ink, confirm button uses Signal fill.
   * alert = something went wrong (checkout "Step 01 · Contact is incomplete"): Signal title, alertdialog role.
   */
  tone?: "default" | "danger" | "alert";
  children?: ReactNode;
  actions: ReactNode;
  width?: 400 | 440 | 460 | 560;
  /** Where focus goes on close instead of the opener (e.g. the first invalid field). */
  focusOnClose?: () => HTMLElement | null | undefined;
}

/** Centred panel on Paper, shadow-modal, fades in and rises 8 px in 240 ms. Used for payment errors and admin confirms. */
export function Modal({ open, onOpenChange, title, description, tone = "default", children, actions, width = 460, focusOnClose }: ModalProps) {
  const focus = useReturnFocus(focusOnClose);
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-modal bg-scrim data-[state=open]:animate-[fade-in_240ms_var(--ease-standard)]" />
        <D.Content
          {...focus}
          role={tone === "alert" ? "alertdialog" : "dialog"}
          className={cn(
            "fixed left-1/2 top-160 z-modal flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col gap-14 bg-bg p-24 shadow-modal outline-none",
            "data-[state=open]:animate-[rise-in_240ms_var(--ease-standard)]",
          )}
          style={{ width }}
        >
          <D.Title className={cn("text-xs font-medium", tone === "alert" && "text-danger")}>{title}</D.Title>
          {description ? <D.Description className="text-fg-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          {children}
          <div className="flex gap-10">{actions}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
