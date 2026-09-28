"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  /** CSS grid track, e.g. "90px" or "1.4fr". */
  width: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Whole-row link (orders → order detail). Cells with their own links stop propagation. */
  rowHref?: (row: T) => string;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (s: Set<string>) => void;
  /** Ink bar shown above the table when ≥ 1 row is selected: "{n} selected" + actions + Clear. */
  bulkActions?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  caption: string;
}

/**
 * Admin table in a white box: 36 px header row (Stone, Ink bottom rule), 44 px rows (Line rule),
 * hover #F4F1ED. Loading: 6 Mist skeleton rows. Empty: one sentence + one action, centred.
 * Built on CSS grid with role=table semantics so column widths match the canvas exactly.
 */
export function DataTable<T>({ rows, columns, rowKey, rowHref, selectable, selected = new Set(), onSelectedChange, bulkActions, empty, loading, caption }: DataTableProps<T>) {
  const tracks = (selectable ? "28px " : "") + columns.map((c) => c.width).join(" ");
  const toggle = (k: string) => {
    const s = new Set(selected);
    if (s.has(k)) s.delete(k);
    else s.add(k);
    onSelectedChange?.(s);
  };
  return (
    <div className="flex flex-col gap-12">
      {selectable && selected.size > 0 && (
        <div className="flex items-center gap-10 bg-fg px-14 py-10 text-fg-inverse" role="region" aria-label="Bulk actions">
          <span>{selected.size} selected</span>
          {bulkActions}
          <button type="button" onClick={() => onSelectedChange?.(new Set())} className="ml-auto">Clear</button>
        </div>
      )}
      <div role="table" aria-label={caption} className="border border-border bg-surface px-20">
        <div role="row" className="grid min-h-36 items-center gap-x-12 border-b border-fg text-fg-muted" style={{ gridTemplateColumns: tracks }}>
          {selectable && (
            <span role="columnheader">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={rows.length > 0 && selected.size === rows.length}
                onChange={(e) => onSelectedChange?.(e.target.checked ? new Set(rows.map(rowKey)) : new Set())}
                className="accent-fg"
              />
            </span>
          )}
          {columns.map((c) => (
            <span key={c.key} role="columnheader" className={c.align === "right" ? "text-right" : undefined}>
              {c.header}
            </span>
          ))}
        </div>
        {loading
          ? Array.from({ length: 6 }, (_, i) => <div key={i} className="my-12 h-20 bg-surface-muted" aria-hidden="true" />)
          : rows.length === 0
            ? <div className="py-40 text-center text-fg-muted">{empty ?? "Nothing here yet."}</div>
            : rows.map((r) => {
                const k = rowKey(r);
                const href = rowHref?.(r);
                return (
                  <div
                    key={k}
                    role="row"
                    className={cn("grid min-h-44 items-center gap-x-12 border-b border-border last:border-b-0 hover:bg-surface-hover", href && "cursor-pointer")}
                    style={{ gridTemplateColumns: tracks }}
                    onClick={href ? () => (window.location.href = href) : undefined}
                  >
                    {selectable && (
                      <span role="cell" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${k}`} checked={selected.has(k)} onChange={() => toggle(k)} className="accent-fg" />
                      </span>
                    )}
                    {columns.map((c) => (
                      <span key={c.key} role="cell" className={cn("min-w-0 truncate", c.align === "right" && "text-right")}>
                        {c.cell(r)}
                      </span>
                    ))}
                  </div>
                );
              })}
      </div>
    </div>
  );
}
