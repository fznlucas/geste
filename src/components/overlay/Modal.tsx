"use client";

import * as D from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** danger = destructive confirm (refund, delete): title stays Ink, confirm button uses Signal fill. */
  tone?: "default" | "danger";
  children?: ReactNode;
  actions: ReactNode;
  width?: 400 | 460 | 560;
}

/** Centred panel on Paper, shadow-modal, fades in and rises 8 px in 240 ms. Used for payment errors and admin confirms. */
export function Modal({ open, onOpenChange, title, description, children, actions, width = 460 }: ModalProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-modal bg-scrim data-[state=open]:animate-[fade-in_240ms_var(--ease-standard)]" />
        <D.Content
          className={cn(
            "fixed left-1/2 top-160 z-modal flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col gap-14 bg-bg p-24 shadow-modal outline-none",
            "data-[state=open]:animate-[rise-in_240ms_var(--ease-standard)]",
          )}
          style={{ width }}
        >
          <D.Title className="text-xs font-medium">{title}</D.Title>
          {description ? <D.Description className="text-fg-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          {children}
          <div className="flex gap-10">{actions}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
