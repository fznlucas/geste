import { ProgressBar } from "../primitives/ProgressBar";

/** "12 of 50 left" with a thin bar; ≤ 5 left turns the words Signal (urgency, stated honestly). */
export function EditionCounter({ left, total, size }: { left: number; total: number; size: string }) {
  const low = left > 0 && left <= 5;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between">
        <span className="text-fg-muted">Edition of {total} · {size}</span>
        <span className={low ? "text-danger" : undefined}>{left === 0 ? "Sold out" : `${left} of ${total} left`}</span>
      </div>
      <ProgressBar value={total - left} max={total} label={`${total - left} of ${total} sold`} tone={low ? "danger" : "default"} />
    </div>
  );
}
