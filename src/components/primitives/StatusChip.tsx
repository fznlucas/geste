import type { StatusState } from "@/lib/types";
import { cn } from "@/lib/cn";

export interface StatusChipProps {
  state: StatusState;
  label: string;
  className?: string;
}

/**
 * Dot + word. Never colour alone. The dot is 8 px + its 1 px border (10 px, as the admin boards measure .dot).
 * done = filled Ink dot · todo = hollow dot · issue = Signal dot and Signal word · off = Line-grey dot, Stone word.
 */
export function StatusChip({ state, label, className }: StatusChipProps) {
  return (
    <span className={cn("inline-flex items-center gap-6 whitespace-nowrap", state === "issue" ? "text-danger" : state === "off" ? "text-fg-muted" : "text-fg", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-10 shrink-0 rounded-full border",
          state === "done" && "border-fg bg-fg",
          state === "todo" && "border-fg bg-transparent",
          state === "issue" && "border-danger bg-danger",
          state === "off" && "border-border-field bg-border-field",
        )}
      />
      {label}
    </span>
  );
}
