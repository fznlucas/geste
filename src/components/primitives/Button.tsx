import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "ghost" | "text" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** md = 48 px primary / 44 px ghost. sm = 32 px dense (admin). */
  size?: "md" | "sm";
  /** Right-hand content on primary buttons: an arrow "→", a price "$19", "+". Label stays left. */
  trailing?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center gap-12 font-mono text-xs cursor-pointer select-none " +
  "transition-colors duration-150 ease-standard " +
  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-3 " +
  "disabled:opacity-40 disabled:cursor-not-allowed aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  // Ink block, label left, arrow or price right (space-between).
  primary: "bg-fg text-fg-inverse justify-between px-16 hover:bg-action-hover active:bg-action-hover",
  // 1 px Ink outline, centred label.
  ghost: "bg-transparent text-fg border border-fg justify-center px-14 hover:bg-surface-muted",
  // Text only; underline marks the selected/link state.
  text: "bg-transparent text-fg px-0 hover:text-fg-muted underline-offset-3",
  // Destructive: Signal outline + text (refund, delete). Filled Signal only inside a confirm modal.
  danger: "bg-transparent text-danger border border-danger justify-center px-14 hover:bg-surface-muted",
};

const sizes = {
  md: { primary: "min-h-48", ghost: "min-h-44", text: "min-h-32", danger: "min-h-44" },
  sm: { primary: "min-h-32", ghost: "min-h-32", text: "min-h-32", danger: "min-h-32" },
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", trailing, loading, fullWidth, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size][variant], fullWidth && "w-full", className)}
      {...rest}
    >
      <span>{children}</span>
      {variant === "primary" && (trailing !== undefined || loading) && (
        <span aria-hidden="true" className="tabular-nums">
          {loading ? <LoadingDots /> : trailing}
        </span>
      )}
    </button>
  );
});

/** Three dots pulsing in sequence; replaces the trailing arrow while loading. */
export function LoadingDots() {
  return (
    <span className="inline-flex gap-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-4 bg-current motion-safe:animate-pulse"
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  );
}
