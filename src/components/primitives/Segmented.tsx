"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<V extends string> {
  value: V;
  /** Text, or responsive text (e.g. "+ print" on phones, "Guide + list + print" on desktop). */
  label: ReactNode;
  disabled?: boolean;
  /** Small Stone note after the label, e.g. "(sold out)". */
  note?: string;
}

export interface SegmentedProps<V extends string> {
  label: string;
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
  /** Space between choices (cn does not merge classes, so it is its own prop). Default 14 px. */
  gap?: string;
}

/**
 * Text choices in a row (format, level, palette, filters). Unselected: Stone. Hover: Ink.
 * Selected: Ink + underline offset 4. Implemented as a radiogroup for arrow-key support.
 */
export function Segmented<V extends string>({ label, options, value, onChange, className, gap = "gap-x-14" }: SegmentedProps<V>) {
  const move = (dir: 1 | -1) => {
    const enabled = options.filter((o) => !o.disabled);
    const i = enabled.findIndex((o) => o.value === value);
    const next = enabled[(i + dir + enabled.length) % enabled.length];
    if (next) onChange(next.value);
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-y-4", gap, className)}
      onKeyDown={(e) => {
        const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (dir) {
          e.preventDefault();
          move(dir);
        }
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              // Phone boards draw these 36 px tall (.pill), desktop boards 32 px (.tx).
              "inline-flex min-h-36 items-center gap-6 transition-colors duration-150 lg:min-h-32",
              on ? "text-fg underline underline-offset-4" : "text-fg-muted hover:text-fg",
              "disabled:cursor-not-allowed disabled:line-through disabled:opacity-40",
              "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-2",
            )}
          >
            {o.label}
            {o.note && <span className="text-fg-muted no-underline">{o.note}</span>}
          </button>
        );
      })}
    </div>
  );
}
