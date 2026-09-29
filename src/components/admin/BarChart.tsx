"use client";

import { useState } from "react";

export interface BarDatum {
  label: string; // "Sep 22"
  value: number;
  /** Tooltip text, e.g. "Sep 22 · $310 · 14 orders". */
  tip: string;
}

export interface BarChartProps {
  data: BarDatum[];
  /** Height of the plot area; 28 px above it hold the tooltip (AdminDashboard: 240). */
  height?: number;
  /** Caption of the screen-reader table. */
  caption: string;
  /** Middle of the label row, e.g. an annotation "Sep 22 · TikTok “first canvas” ep. 04 posted". Default: the caption. */
  note?: string;
  format?: (v: number) => string;
}

/**
 * Single-series vertical bars (dataviz rules): one axis, Stone bars, the hovered bar turns Ink, 2 px gap,
 * 3 px rounded data end, baseline 1 px Ink, tooltip above the hovered bar. Hit area = full column height;
 * bars are focusable and show the same tooltip. Label row 14 px under the baseline: first day · note · last day.
 * A visually hidden table carries the same values for screen readers.
 */
export function BarChart({ data, height = 240, caption, note, format = (v: number) => String(v) }: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="m-0 flex flex-col gap-14">
      <div className="relative flex gap-2 border-b border-fg pt-28" style={{ height: height + 29 }} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex h-full flex-1 cursor-pointer items-end focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            tabIndex={0}
            role="img"
            aria-label={d.tip}
          >
            {/* Whole percents, as drawn. */}
            <span className="block w-full rounded-t-bar" style={{ height: `${Math.round((d.value / max) * 100)}%`, background: hover === i ? "var(--color-fg)" : "var(--color-fg-muted)" }} />
          </div>
        ))}
        {hover !== null && data[hover] && (
          <div role="tooltip" className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap bg-fg px-8 py-3 text-fg-inverse" style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}>
            {data[hover].tip}
          </div>
        )}
      </div>
      <figcaption className="flex justify-between gap-12 text-fg-muted">
        <span>{data[0]?.label}</span>
        {(note ?? caption) && <span>{note ?? caption}</span>}
        <span>{data.at(-1)?.label}</span>
      </figcaption>
      {/* In a clipped box: a sr-only table still lays out at its content width (page scroll on phones). */}
      <div className="sr-only">
        <table>
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
      </div>
    </figure>
  );
}
