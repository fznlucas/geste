import { cn } from "@/lib/cn";

/** Count in a 1 px box (admin sidebar). Inverts with its row when the row is active. */
export function Badge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return <span className={cn("inline-block min-w-18 border border-current px-5 text-center tabular-nums", className)}>{count}</span>;
}
