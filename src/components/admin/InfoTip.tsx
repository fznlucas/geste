"use client";

import Link from "next/link";
import { Popover } from "../overlay/Popover";

export interface InfoTipProps {
  /** What the figure is, in one sentence (the metric's `definition`). */
  definition: string;
  /** The rows behind the figure ("See the rows"). */
  rowsHref?: string;
  /** Names the figure for screen readers: "About Revenue · 30 d". */
  label: string;
}

/**
 * "?" next to a figure (docs/admin-v2/06 §2): its definition in one sentence and a link to the rows it
 * counts. A 24 px square (the smallest target), sharp corners, Stone until hovered; the panel is the Popover.
 */
export function InfoTip({ definition, rowsHref, label }: InfoTipProps) {
  return (
    <Popover
      align="start"
      width={280}
      trigger={
        <button
          type="button"
          aria-label={`About ${label}`}
          className="relative z-10 inline-flex size-24 shrink-0 cursor-pointer items-center justify-center border border-border-field font-mono text-xs text-fg-muted hover:border-fg hover:text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
          ?
        </button>
      }
    >
      <div className="flex flex-col gap-8 p-14">
        <p>{definition}</p>
        {rowsHref && (
          <Link href={rowsHref} className="self-start underline underline-offset-3 hover:text-fg-muted">
            See the rows
          </Link>
        )}
      </div>
    </Popover>
  );
}

export interface FilterSummaryProps {
  /** "42 orders" */
  count: string;
  /** The filters in force, in words ("To ship", "Sep 6 – Oct 5"). */
  filters: string[];
  /** Shown when a filter is on. */
  onClear?: () => void;
}

/** The line above a table: "42 orders · To ship · Sep 6 – Oct 5 · Clear filters" (docs/admin-v2/06 §5). */
export function FilterSummary({ count, filters, onClear }: FilterSummaryProps) {
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-8 text-fg-muted">
      <span className="text-fg">{count}</span>
      {filters.map((f) => (
        <span key={f}>· {f}</span>
      ))}
      {onClear && filters.length > 0 && (
        <button type="button" onClick={onClear} className="cursor-pointer underline underline-offset-3 hover:text-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg">
          Clear filters
        </button>
      )}
    </p>
  );
}
