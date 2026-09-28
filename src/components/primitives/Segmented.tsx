"use client";

import { cn } from "@/lib/cn";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean;
  /** Small Stone note after the label, e.g. "+$2" for Custom level. */
  note?: string;
}

export interface SegmentedProps<V extends string> {
  label: string;
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}

/**
 * Text choices in a row (format, level, palette, filters). Unselected: Stone. Hover: Ink.
 * Selected: Ink + underline offset 4. Implemented as a radiogroup for arrow-key support.
 */
export function Segmented<V extends string>({ label, options, value, onChange, className }: SegmentedProps<V>) {
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
      className={cn("flex flex-wrap items-center gap-x-14 gap-y-4", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") (e.preventDefault(), move(1));
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") (e.preventDefault(), move(-1));
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
              "inline-flex min-h-32 items-center gap-6 transition-colors duration-150",
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
