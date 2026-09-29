"use client";

import * as D from "@radix-ui/react-dialog";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button } from "../primitives/Button";

export type PrintScope = "full" | "layer";

export interface PrintSheetProps {
  open: boolean;
  onClose: () => void;
  printsLeft: number;
  /** Prints per purchase (3). */
  printsTotal?: number;
  /** Pages of the full guide (8 with three layers). */
  pages: number;
  /** "Camille M." */
  name: string;
  /** "GS-2041" */
  orderNumber: string;
  scope: PrintScope;
  onScope: (scope: PrintScope) => void;
  onPrepare: () => void;
  preparing?: boolean;
  /** sheet: pinned to the bottom of the phone (AppPrint). panel: centred, 440 px (desktop). */
  variant?: "sheet" | "panel";
  /** false when the page draws its own scrim under a dimmed background (AppPrint). */
  scrim?: boolean;
}

/**
 * "Print this guide" (AppPrint): prints left as three 2 px segments (used ones Ink), what the
 * watermark carries, full guide or current layer, "Prepare PDF". At 0: "No prints left. Ask us for
 * more." and the button is disabled. A Radix dialog: focus stays inside, Escape and Close leave.
 */
export function PrintSheet({ open, onClose, printsLeft, printsTotal = 3, pages, name, orderNumber, scope, onScope, onPrepare, preparing, variant = "sheet", scrim = true }: PrintSheetProps) {
  const used = Math.max(0, printsTotal - printsLeft);
  const none = printsLeft <= 0;
  return (
    <D.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay className={cn("fixed inset-0 z-modal", scrim && "bg-scrim-sheet data-[state=open]:animate-[fade-in_240ms_var(--ease-standard)]")} />
        <D.Content
          aria-describedby={undefined}
          tabIndex={-1}
          // Focus the sheet itself, not "Close": Tab reaches the choices from there.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }}
          className={cn(
            "fixed z-modal flex flex-col gap-16 bg-bg outline-none",
            variant === "sheet"
              ? "inset-x-0 bottom-0 px-16 pb-24 pt-20 data-[state=open]:animate-[rise-in_240ms_var(--ease-standard)]"
              : "left-1/2 top-160 w-440 max-w-[calc(100vw-32px)] -translate-x-1/2 p-24 shadow-modal data-[state=open]:animate-[rise-in_240ms_var(--ease-standard)]",
          )}
        >
          <div className="flex items-center justify-between">
            <D.Title className="m-0 text-xs font-medium tracking-normal">Print this guide</D.Title>
            <D.Close className="-my-12 inline-flex min-h-44 cursor-pointer items-center underline underline-offset-3 hover:text-fg-muted">Close</D.Close>
          </div>
          <div aria-hidden="true" className="flex gap-6">
            {Array.from({ length: printsTotal }, (_, i) => (
              <span key={i} className={cn("h-2 flex-1", i < used ? "bg-fg" : "bg-border")} />
            ))}
          </div>
          {none ? (
            <span>
              No prints left.{" "}
              <Link href="/help" className="underline underline-offset-3 hover:text-fg-muted">
                Ask us for more.
              </Link>
            </span>
          ) : (
            <span>
              {printsLeft} of {printsTotal} prints left
            </span>
          )}
          <p className="m-0 text-fg-muted">
            {pages} pages, A4. Each page carries your name and order number: {name} · #{orderNumber}.
          </p>
          <fieldset className="m-0 flex flex-col gap-8 border-0 p-0">
            <legend className="sr-only">What to print</legend>
            {(
              [
                ["full", `Full guide · ${pages} pages`],
                ["layer", "Current layer only · 1 page"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-32 cursor-pointer items-center gap-10">
                <input type="radio" name="print-scope" value={value} checked={scope === value} onChange={() => onScope(value)} disabled={none} className="mb-0 ml-5 mr-3 mt-3 accent-fg" />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <Button fullWidth trailing="→" onClick={onPrepare} disabled={none || preparing} loading={preparing}>
            {preparing ? "Preparing your PDF…" : "Prepare PDF"}
          </Button>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
