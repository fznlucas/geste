"use client";

import { useState } from "react";

export interface BarDatum {
  label: string; // "Sep 22"
  value: number;
  /** Tooltip text, e.g. "Sep 22 · $310 · 14 orders". */
  tip: string;
}

/**
 * Single-series vertical bars (dataviz rules): one axis, Stone bars, the hovered bar turns Ink, 2 px gap,
 * 3 px rounded data end, baseline 1 px Ink, tooltip above the hovered bar. Hit area = full column height.
 * A visually hidden table carries the same values for screen readers.
 */
export function BarChart({ data, height = 240, caption, format = (v: number) => String(v) }: { data: BarDatum[]; height?: number; caption: string; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="m-0">
      <div className="relative flex gap-2 border-b border-fg pt-28" style={{ height }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div key={d.label} className="flex h-full flex-1 cursor-pointer items-end" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} role="img" aria-label={d.tip}>
            <span className="block w-full rounded-t-bar" style={{ height: `${(d.value / max) * 100}%`, background: hover === i ? "var(--color-fg)" : "var(--color-fg-muted)" }} />
          </div>
        ))}
        {hover !== null && data[hover] && (
          <div role="tooltip" className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap bg-fg px-8 py-3 text-fg-inverse" style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
            {data[hover].tip}
          </div>
        )}
      </div>
      <figcaption className="mt-8 flex justify-between text-fg-muted">
        <span>{data[0]?.label}</span>
        <span>{caption}</span>
        <span>{data.at(-1)?.label}</span>
      </figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
