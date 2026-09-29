import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  invalid?: boolean;
  /** inline = checkout rows (boards Checkout, MCheckout): box top-aligned with the first line, text 23 px from the left edge as drawn, no 44 px row.
   *  setting = Settings / MSettings preferences: 32 px rows (36 on phones), text 30 px from the left edge like the boards' native boxes.
   *  end = Legal / MLegal cookie rows: text left, box right (16 px from the edge like the boards' native box); the row's height comes from `className`. */
  layout?: "row" | "inline" | "setting" | "end";
  /** `setting` only: space between box and text (cn does not merge classes). Board gap + 2 px: our box is 1 px wider and has no native 3 px margin. Default 12. */
  gap?: string;
}

/**
 * 14 px square, 1 px Ink border, Ink fill + Paper check when on. Whole row is the hit area:
 * 44 px tall by default; `inline` rows are the label's height (20 px a line) and at least 24 px wide targets.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, invalid, layout = "row", gap = "gap-12", className, ...rest }, ref) {
  const inline = layout === "inline";
  const row = { row: "inline-flex min-h-44 cursor-pointer items-center gap-8", inline: "flex cursor-pointer items-start gap-9", setting: cn("flex min-h-36 cursor-pointer items-center lg:min-h-32", gap), end: "flex cursor-pointer flex-row-reverse items-center justify-between gap-12" }[layout];
  return (
    <label className={cn(row, rest.disabled && "cursor-not-allowed opacity-40", className)}>
      <span className={cn("relative inline-flex size-14 shrink-0", inline && "mt-3", layout === "setting" && "ml-4", layout === "end" && "mr-2")}>
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            "peer size-14 cursor-pointer appearance-none border bg-surface checked:bg-fg",
            invalid ? "border-danger" : "border-fg",
            "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-2",
          )}
          {...rest}
        />
        <svg aria-hidden="true" viewBox="0 0 12 12" className="pointer-events-none absolute inset-0 hidden size-14 text-fg-inverse peer-checked:block" fill="none" stroke="currentColor" strokeWidth={1.1}>
          <path d="M2.5 6.2L5 8.7L9.5 3.5" />
        </svg>
      </span>
      <span>{label}</span>
    </label>
  );
});
