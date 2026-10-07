import { cn } from "@/lib/cn";

/**
 * Loading block (docs/admin-v2/06): a still Mist rectangle where content will be — no spinner, no shimmer,
 * nothing moves. Sized by its classes; hidden from assistive tech (the region around it says aria-busy).
 */
export function MistBlock({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("bg-surface-muted", className)} />;
}

/** The admin while the simulated history is being prepared: the page's skeleton in Mist blocks. */
export function AdminMistPage({ phone = false, busy = true }: { phone?: boolean; /** False for a sample (/kit): not a region being loaded. */ busy?: boolean }) {
  return (
    <div role="status" aria-busy={busy || undefined} aria-label="Preparing the store's history" className={cn("flex flex-1 flex-col", phone ? "gap-12 px-16 pt-16" : "gap-24 px-32 pb-40 pt-24")}>
      <MistBlock className={phone ? "h-28 w-160" : "h-44 w-320"} />
      <div className={cn("grid gap-16", phone ? "grid-cols-2" : "grid-cols-6")}>
        {Array.from({ length: phone ? 4 : 6 }, (_, i) => <MistBlock key={i} className="h-100" />)}
      </div>
      <MistBlock className={phone ? "h-240" : "h-360"} />
    </div>
  );
}
