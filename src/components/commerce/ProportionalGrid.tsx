import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Smallest share of the reference column a work's long side takes. */
export const GRID_MIN_SHARE = 0.7;

/** What sizes a work in the grid: its ratio and its reference surface. */
export interface GridShape {
  /** Width / height of the image (or of the print's sheet): shown whole, at this ratio. */
  ratio: number;
  /** Surface in cm² of the work's reference canvas (works.original_size). */
  area: number;
}

export interface ProportionalGridItem extends GridShape {
  key: string;
  node: ReactNode;
}

type Cols = 1 | 2 | 3 | 4 | 5;
type Bp = "base" | "md" | "lg";

export interface ProportionalGridProps {
  items: ProportionalGridItem[];
  /**
   * Works per row: phones (base), from 768 px (md), from 1200 px (lg). Default 2 · 3 · 5.
   * The admin passes { base: 2, md: 5 } (its desktop starts at 768 px).
   */
  cols?: { base: Cols; md?: Cols; lg?: Cols };
  /**
   * The largest surface of the catalog: its long side is the reference size. Default: the largest of
   * `items`; pass the catalog's when the grid shows part of it (filters, Home).
   */
  maxArea?: number;
  /**
   * Every list the grid can show (each filter combination of the page, the unfiltered one first). The
   * reference size is the largest that lets the widest row of any of them fit with the minimum gap, so
   * the scale never changes when filtering. Default: `[items]`.
   */
  scaleSets?: GridShape[][];
  /** Minimum gap between works, as CSS variable classes: "[--gap:16px] lg:[--gap:40px]" (Shop). */
  gap?: string;
  /** Space from the captions' bottom to the next row: "mb-28 lg:mb-64" (boards Shop, MShop). */
  rowSpace?: string;
  className?: string;
}

const SUM_VAR: Record<Bp, string> = { base: "[--sum:var(--sum-base)]", md: "md:[--sum:var(--sum-md)]", lg: "lg:[--sum:var(--sum-lg)]" };
const COLS_VAR: Record<Bp, Record<Cols, string>> = {
  base: { 1: "[--cols:1]", 2: "[--cols:2]", 3: "[--cols:3]", 4: "[--cols:4]", 5: "[--cols:5]" },
  md: { 1: "md:[--cols:1]", 2: "md:[--cols:2]", 3: "md:[--cols:3]", 4: "md:[--cols:4]", 5: "md:[--cols:5]" },
  lg: { 1: "lg:[--cols:1]", 2: "lg:[--cols:2]", 3: "lg:[--cols:3]", 4: "lg:[--cols:4]", 5: "lg:[--cols:5]" },
};

/** Classes that show an element only while `bp` is the active breakpoint of the grid. */
function onlyAt(bp: Bp, cols: ProportionalGridProps["cols"] & object): string {
  const next = bp === "base" ? (cols.md ? "md" : cols.lg ? "lg" : null) : bp === "md" ? (cols.lg ? "lg" : null) : null;
  const show = bp === "base" ? "block" : bp === "md" ? "hidden md:block" : "hidden lg:block";
  return cn(show, next === "md" && "md:hidden", next === "lg" && "lg:hidden");
}

/** Long side of a work in reference sizes: √(its surface / the largest), at least 70 %. */
export function gridShare(area: number, maxArea: number): number {
  return Math.max(GRID_MIN_SHARE, Math.min(1, Math.sqrt(area / maxArea)));
}

/** Width of a work in reference sizes: its long side is `gridShare`, the other side follows its ratio. */
const widthShare = (it: GridShape, max: number) => gridShare(it.area, max) * Math.min(1, it.ratio);

/**
 * Widest row, in reference sizes, among every list the grid can show cut into rows of `n`: the
 * reference size is (width − (n − 1) × gap) / this.
 */
export function widestRow(sets: GridShape[][], n: number, max: number): number {
  let widest = 0;
  for (const set of sets) {
    for (let start = 0; start < set.length; start += n) {
      widest = Math.max(widest, set.slice(start, start + n).reduce((sum, it) => sum + widthShare(it, max), 0));
    }
  }
  return widest || 1;
}

/** CSS width of `share` reference sizes: the widest row plus its minimum gaps fills the content. */
const refWidth = (share: number) => `calc((100% - (var(--cols) - 1) * var(--gap)) / var(--sum) * ${share})`;

/**
 * Grid by original size (Shop, Home, /prints, admin catalog; docs/decisions.md "Grid by original
 * size"). Each work is shown whole at its own ratio, no ground; its long side is √(surface of its
 * reference canvas / the catalog's largest) of the reference size, 70 % at least, so a work and its
 * turned version are the same size. The reference size is the largest that fits the widest row the
 * page can show (`scaleSets`) in the content width with the minimum gap, per breakpoint. Rows keep the same number of works (5,
 * 3, 2): the first against the left edge, the last against the right edge, equal space between them, the minimum gap on the widest row
 * (space-between); a short last row keeps the slots of a full one (zero-width fillers), so its works
 * sit where a full row's would, from the left. Everything in a row
 * stands on its bottom; the captions follow their image's width on one line; the space from the
 * captions to the next row is constant (`rowSpace`). Pure CSS.
 */
export function ProportionalGrid({ items, cols = { base: 2, md: 3, lg: 5 }, maxArea, scaleSets, gap = "[--gap:16px] lg:[--gap:40px]", rowSpace = "mb-28 lg:mb-64", className }: ProportionalGridProps) {
  const sets = scaleSets?.length ? scaleSets : [items];
  const max = maxArea ?? Math.max(...sets.flat().map((it) => it.area));
  const bps = (["base", "md", "lg"] as const).filter((bp) => cols[bp] !== undefined);
  const n = (bp: Bp) => cols[bp]!;
  const last = items.length - 1;
  const sums = Object.fromEntries(bps.map((bp) => [`--sum-${bp}`, widestRow(sets, n(bp), max)]));
  return (
    <div
      data-grid=""
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-(--gap)",
        COLS_VAR.base[cols.base], cols.md && COLS_VAR.md[cols.md], cols.lg && COLS_VAR.lg[cols.lg],
        ...bps.map((bp) => SUM_VAR[bp]),
        gap,
        className,
      )}
      style={sums as CSSProperties}
    >
      {items.map((it, i) => (
        <Fragment key={it.key}>
          <div data-grid-item="" data-share={gridShare(it.area, max)} className={cn("min-w-0", rowSpace)} style={{ width: refWidth(widthShare(it, max)) } as CSSProperties}>
            {it.node}
          </div>
          {/* Row ends, one per breakpoint (zero height, full basis). */}
          {i < last && bps.map((bp) => ((i + 1) % n(bp) === 0 ? <span key={bp} aria-hidden="true" className={cn("h-0 basis-full", onlyAt(bp, cols))} /> : null))}
        </Fragment>
      ))}
      {bps.flatMap((bp) => {
        const missing = (n(bp) - (items.length % n(bp))) % n(bp);
        return Array.from({ length: missing }, (_, k) => (
          <span key={`${bp}-${k}`} aria-hidden="true" className={cn("h-0 w-0", onlyAt(bp, cols))} />
        ));
      })}
    </div>
  );
}
