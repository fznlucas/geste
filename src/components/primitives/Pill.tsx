import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** Dense 32 px filter/range button for the admin. Border #D8D3CC, Ink when selected. */
export function Pill({ selected, className, type = "button", ...rest }: PillProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-32 items-center border px-10 text-xs",
        selected ? "border-fg text-fg" : "border-border-field text-fg hover:border-fg",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-2",
        className,
      )}
      {...rest}
    />
  );
}
