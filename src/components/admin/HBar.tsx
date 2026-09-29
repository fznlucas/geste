export interface HBarRow {
  label: string;
  value: number;
  /** Right-hand text when it is not the bare number ("92 orders", "71%"). */
  display?: string;
}

/**
 * Horizontal bars for rankings and funnels (AdminAnalytics): 170 px label · 10 px Mist track with an
 * Ink fill whose data end is rounded 3 px · value right-aligned in 70 px. Rows are 30 px, 14 px apart (the box gap on the boards). Lengths are
 * relative to the largest row. `highlight` turns a row's fill Signal (with its label, never colour alone).
 */
export function HBar({ rows, unit = "", highlight, label }: { rows: HBarRow[]; unit?: string; highlight?: string[]; label?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div role="list" aria-label={label} className="flex flex-col gap-14">
      {rows.map((r) => (
        <div role="listitem" key={r.label} className="grid min-h-30 grid-cols-[170px_1fr_70px] items-center gap-x-12">
          <span>{r.label}</span>
          <span className="relative h-10 bg-surface-muted" aria-hidden="true">
            <span
              className={`absolute inset-y-0 left-0 rounded-r-bar ${highlight?.includes(r.label) ? "bg-danger" : "bg-fg"}`}
              style={{ width: `${((r.value / max) * 100).toFixed(1)}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{r.display ?? `${r.value}${unit}`}</span>
        </div>
      ))}
    </div>
  );
}
