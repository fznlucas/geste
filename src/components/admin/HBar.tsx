/** Horizontal bars for rankings and funnels: 170 px label · 10 px Mist track with Ink fill, 3 px data end · value right. */
export function HBar({ rows, unit = "", highlight }: { rows: Array<{ label: string; value: number }>; unit?: string; highlight?: string[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col">
      {rows.map((r) => (
        <div key={r.label} className="grid min-h-30 grid-cols-[170px_1fr_70px] items-center gap-x-12">
          <span>{r.label}</span>
          <span className="relative h-10 bg-surface-muted" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 rounded-r-bar" style={{ width: `${(r.value / max) * 100}%`, background: highlight?.includes(r.label) ? "var(--color-danger)" : "var(--color-fg)" }} />
          </span>
          <span className="text-right tabular-nums">
            {r.value.toLocaleString("en-US")}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}
