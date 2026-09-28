"use client";

import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Row switch used in settings and admin notifications: label left, 28×16 track right. No colour but Ink. */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex min-h-44 w-full items-center justify-between gap-16 text-left disabled:opacity-40",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-2",
        className,
      )}
    >
      <span>{label}</span>
      <span aria-hidden="true" className={cn("relative h-16 w-28 border border-fg transition-colors duration-150", checked ? "bg-fg" : "bg-surface")}>
        <span
          className={cn(
            "absolute top-2 size-10 transition-transform duration-150 ease-standard",
            checked ? "translate-x-14 bg-fg-inverse" : "translate-x-2 bg-fg",
          )}
        />
      </span>
    </button>
  );
}
