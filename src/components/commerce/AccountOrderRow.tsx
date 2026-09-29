"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface AccountOrderRowProps {
  /** "#GS-2041" */
  number: string;
  /** "Oct 1, 2026" */
  date: string;
  /** "Print shipped · arriving Oct 3–5" */
  status: string;
  /** "$70" */
  total: string;
  /** Receipt lines: "N°03 — Guide, 60×80" · "$19", then shipping. */
  lines: Array<{ label: string; price: string }>;
  open: boolean;
  onToggle: () => void;
  /** Ghost buttons under the lines (Track the print, Open in library, invoice). */
  actions: ReactNode;
  variant?: "desktop" | "phone";
}

/**
 * One order of Account › Orders (Orders, MOrders): a 56 px row (number, date, status, total, +/−)
 * that opens its receipt lines and actions. Phone: 64 px, two lines ("#GS-2041 · $70" over the
 * date and status).
 */
export function AccountOrderRow({ number, date, status, total, lines, open, onToggle, actions, variant = "desktop" }: AccountOrderRowProps) {
  const panelId = useId();
  const phone = variant === "phone";
  const toggle = cn(
    "w-full cursor-pointer text-left hover:text-fg-muted",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-2",
    phone ? "flex min-h-64 items-center justify-between" : "grid min-h-56 grid-cols-[140px_140px_1fr_100px_24px] items-center",
  );
  return (
    <div className={phone ? "border-b border-border" : "border-t border-border"}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className={toggle}>
        {phone ? (
          <span className="flex flex-col leading-[18px]">
            <span>{number} · {total}</span>
            <span className="text-fg-muted">{date} · {status}</span>
          </span>
        ) : (
          <>
            <span>{number}</span>
            <span className="text-fg-muted">{date}</span>
            <span>{status}</span>
            <span className="text-right tabular-nums">{total}</span>
          </>
        )}
        <span aria-hidden="true" className="text-right">{open ? "−" : "+"}</span>
      </button>
      <div id={panelId} hidden={!open} className={phone ? "pb-16" : "pb-20 pt-4"}>
        <div className={cn("flex flex-col", phone ? "gap-6" : "gap-8")}>
          {lines.map((l, i) => (
            <div key={i} className="flex justify-between">
              <span>{l.label}</span>
              <span className="tabular-nums">{l.price}</span>
            </div>
          ))}
          <div className={cn("mt-8 flex", phone ? "gap-8 [&>*]:grow" : "gap-10")}>{actions}</div>
        </div>
      </div>
    </div>
  );
}
