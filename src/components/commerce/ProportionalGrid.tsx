import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Column gap: 14 px below 1200 px, 40 px from 1200 (boards Shop, MShop). */
const GAP = { base: 14, md: 14, lg: 40 } as const;
/** Desktop content width the guard-rail is measured on by default (Shop, /prints: 1264 − 2 × 32). */
const CONTENT = 1200;
/** Ratio of a 4:5 work: stands in for the missing partner of a lone portrait when there is no pair to copy. */
const FILLER = 0.8;

type Breakpoint = keyof typeof GAP;

export interface ProportionalGridItem {
  key: string;
  /** Width / height of the image (or of the print's sheet). */
  ratio: number;
  node: ReactNode;
}

export interface ProportionalGridProps {
  items: ProportionalGridItem[];
  /** Items per row on tablets (≥ 768 px) and desktop (≥ 1200 px). Phones: pairs, a landscape work alone. */
  perRow?: { md: number; lg: number };
  /**
   * Desktop guard-rail, in px at the 1200 px content width (default 190–280). A justified row taller
   * than `max` is not forced: it stays at `max`, left-aligned (docs/decisions.md "Justified grid").
   * `fallback`: height of a grid whose only row is incomplete (a filtered grid).
   */
  heights?: { min: number; max: number; fallback: number };
  /** Phones: a landscape work takes a whole row. Off: pairs whatever the ratio. */
  landscapeAlone?: boolean;
  /** Desktop width of the grid at a 1440 px window, for the guard-rail (default 1200; Home prints 787). */
  contentWidth?: number;
  /** Space under each row: "mb-28 lg:mb-64". */
  rowSpace?: string;
  className?: string;
}

interface Row {
  items: number[];
  /** Sum of the ratios the row is justified on (its own, or the row it copies). */
  sum: number;
  /** Gaps in that justified line. */
  gaps: number;
  /** Desktop: a fixed height in px instead of justified (guard-rail, or a lone incomplete row). */
  fixed?: number;
}

const sumOf = (items: ProportionalGridItem[], idx: number[]) => idx.reduce((s, i) => s + items[i]!.ratio, 0);

/** Tablets and desktop: rows of `n` in order, each justified; an incomplete last row keeps the previous row's height, left-aligned. */
function chunkRows(items: ProportionalGridItem[], n: number): Row[] {
  const rows: Row[] = [];
  for (let start = 0; start < items.length; start += n) {
    const idx = items.slice(start, start + n).map((_, k) => start + k);
    const prev = rows[rows.length - 1];
    rows.push(idx.length === n || !prev ? { items: idx, sum: sumOf(items, idx), gaps: idx.length - 1 } : { items: idx, sum: prev.sum, gaps: prev.gaps });
  }
  return rows;
}

/**
 * Phones: a landscape work alone on the full width; portrait works in pairs that fill the width. A
 * portrait left alone (before a landscape, or last) keeps the height of the nearest pair, left-aligned.
 */
function phoneRows(items: ProportionalGridItem[], landscapeAlone: boolean): Row[] {
  const rows: Row[] = [];
  const wide = (i: number) => landscapeAlone && items[i]!.ratio > 1;
  for (let i = 0; i < items.length; ) {
    if (wide(i)) {
      rows.push({ items: [i], sum: items[i]!.ratio, gaps: 0 });
      i += 1;
    } else if (i + 1 < items.length && !wide(i + 1)) {
      rows.push({ items: [i, i + 1], sum: sumOf(items, [i, i + 1]), gaps: 1 });
      i += 2;
    } else {
      rows.push({ items: [i], sum: Number.NaN, gaps: 1 }); // lone portrait: resolved below
      i += 1;
    }
  }
  rows.forEach((r, k) => {
    if (!Number.isNaN(r.sum)) return;
    const pair = rows.slice(0, k).reverse().find((x) => x.items.length === 2 && !Number.isNaN(x.sum)) ?? rows.slice(k + 1).find((x) => x.items.length === 2);
    r.sum = pair ? pair.sum : items[r.items[0]!]!.ratio + FILLER;
  });
  return rows;
}

/** Desktop rows with the guard-rail applied: heights measured at the 1200 px content width. */
function desktopRows(items: ProportionalGridItem[], n: number, heights: { max: number; fallback: number }, content: number): Row[] {
  const rows = chunkRows(items, n);
  return rows.map((r, k) => {
    const h = (content - r.gaps * GAP.lg) / r.sum;
    if (rows.length === 1 && r.items.length < n) return { ...r, fixed: Math.min(heights.fallback, h) };
    if (h > heights.max) return { ...r, fixed: heights.max };
    // An incomplete row copies its previous row, fixed height included.
    const prev = k > 0 && r.items.length < n ? rows[k - 1]! : null;
    if (prev && (content - prev.gaps * GAP.lg) / prev.sum > heights.max) return { ...r, fixed: heights.max };
    return r;
  });
}

/**
 * Desktop row heights at the 1200 px content width, justified, before the guard-rail (to report rows
 * outside 190–280 px). Complete rows only.
 */
export function justifiedRowHeights(ratios: number[], perRow = 5): number[] {
  const out: number[] = [];
  for (let s = 0; s + perRow <= ratios.length; s += perRow) {
    const row = ratios.slice(s, s + perRow);
    out.push((CONTENT - (perRow - 1) * GAP.lg) / row.reduce((a, b) => a + b, 0));
  }
  return out;
}

/**
 * A justified grid of works (Shop, Home, /prints; docs/decisions.md "Justified grid"): every row fills
 * the content width exactly, left and right, with fixed gaps (14 px phones, 40 px desktop); a row's
 * height is what makes its widths plus gaps equal the width, so rows differ a little in height, and
 * each work is as wide as its ratio at that height. Desktop and tablets: `perRow` in catalog order
 * (5 and 3). Phones: pairs, a landscape work alone on the full width. Captions hang under each image,
 * as wide as it. Desktop guard-rail: a row taller than `heights.max` stays at that height,
 * left-aligned. Pure CSS (per-breakpoint widths from each row's ratios, a line break after each row),
 * so the static render is already right.
 */
export function ProportionalGrid({ items, perRow = { md: 3, lg: 5 }, heights = { min: 190, max: 280, fallback: 260 }, landscapeAlone = true, contentWidth = CONTENT, rowSpace = "mb-28 lg:mb-64", className }: ProportionalGridProps) {
  const layout: Record<Breakpoint, Row[]> = { base: phoneRows(items, landscapeAlone), md: chunkRows(items, perRow.md), lg: desktopRows(items, perRow.lg, heights, contentWidth) };
  const rowOf = (bp: Breakpoint) => {
    const m = new Map<number, Row>();
    for (const r of layout[bp]) for (const i of r.items) m.set(i, r);
    return m;
  };
  const maps = { base: rowOf("base"), md: rowOf("md"), lg: rowOf("lg") };
  const width = (i: number, bp: Breakpoint) => {
    const row = maps[bp].get(i)!;
    const r = items[i]!.ratio;
    if (row.fixed !== undefined) return `${row.fixed * r}px`;
    // 0.1 px less over the whole row, so sub-pixel rounding never pushes the last work to the next line.
    return `calc((100% - ${row.gaps * GAP[bp] + 0.1}px) * ${r / row.sum})`;
  };
  const ends = (bp: Breakpoint) => new Set(layout[bp].map((r) => r.items[r.items.length - 1]!));
  const rowEnds = { base: ends("base"), md: ends("md"), lg: ends("lg") };
  const last = items.length - 1;
  return (
    <div className={cn("flex flex-wrap items-start gap-x-14 lg:gap-x-40", className)}>
      {items.map((it, i) => (
        <Fragment key={it.key}>
          <div
            data-grid-item=""
            className={cn("w-(--w-base) md:w-(--w-md) lg:w-(--w-lg)", rowSpace)}
            style={{ "--w-base": width(i, "base"), "--w-md": width(i, "md"), "--w-lg": width(i, "lg") } as CSSProperties}
          >
            {it.node}
          </div>
          {/* Row ends, one per breakpoint (zero height, full basis). */}
          {i < last && rowEnds.base.has(i) && <span aria-hidden="true" className="h-0 basis-full md:hidden" />}
          {i < last && rowEnds.md.has(i) && <span aria-hidden="true" className="hidden h-0 basis-full md:block lg:hidden" />}
          {i < last && rowEnds.lg.has(i) && <span aria-hidden="true" className="hidden h-0 basis-full lg:block" />}
        </Fragment>
      ))}
    </div>
  );
}
