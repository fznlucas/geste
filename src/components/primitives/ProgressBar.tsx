import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label: string;
  /** Mark the bar as needing attention (e.g. edition almost sold out): Signal fill. */
  tone?: "default" | "danger";
  /** line = the Library's 2 px Line track with a square Ink fill (Account, MAccount). */
  variant?: "bar" | "line";
  className?: string;
}

/** 8 px Mist track, Ink fill, 3 px rounded data end. Used for guide progress, editions, budgets. */
export function ProgressBar({ value, max = 100, label, tone = "default", variant = "bar", className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const line = variant === "line";
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className={cn("relative", line ? "h-2 bg-border" : "h-8 bg-surface-muted", className)}>
      <span className={cn("absolute inset-y-0 left-0", !line && "rounded-r-bar", tone === "danger" ? "bg-danger" : "bg-fg")} style={{ width: `${pct}%` }} />
    </div>
  );
}
