"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { PillButton } from "./AdminUI";

export interface AlertItem {
  id: string;
  text: string;
  when: string;
  href: string;
  /** Read alerts stay listed in Stone (the board dims them to 50 %, which fails contrast); the button counts the unread ones. */
  read?: boolean;
}

/**
 * Top bar "Alerts · 6" (AdminDashboard, state notif): a 380 px white panel pinned 64 px from the top and
 * 32 px from the right of the content column (its nearest positioned ancestor), one 53 px row per alert
 * (a link to its module) + "Close". Escape, a click outside or a link closes it; focus returns to the button.
 */
export function AlertsPopover({ alerts }: { alerts: AlertItem[] }) {
  const unread = alerts.filter((a) => !a.read).length;
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    const close = (refocus: boolean) => {
      setOpen(false);
      if (refocus) button.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <>
      <PillButton ref={button} aria-expanded={open} aria-controls={open ? id : undefined} aria-label={`Alerts, ${unread} unread`} onClick={() => setOpen((o) => !o)}>
        Alerts · {unread}
      </PillButton>
      {open && (
        <div ref={panel} id={id} role="dialog" aria-label="Alerts" className="absolute right-32 top-64 z-popover flex w-380 flex-col bg-surface shadow-pop animate-[fade-in_150ms_var(--ease-standard)]">
          {alerts.length === 0 && <p className="px-16 py-16 text-fg-muted">Nothing new.</p>}
          {alerts.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              onClick={() => setOpen(false)}
              className={cn(
                "box-content grid min-h-52 grid-cols-[1fr_auto] items-center gap-x-12 border-b border-border px-16 hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg",
                a.read && "text-fg-muted",
              )}
            >
              <span>
                {a.text}
                {a.read && <span className="sr-only"> (read)</span>}
              </span>
              <span className="text-fg-muted">{a.when}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              button.current?.focus();
            }}
            className="flex min-h-44 cursor-pointer items-center justify-center font-mono text-xs hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
