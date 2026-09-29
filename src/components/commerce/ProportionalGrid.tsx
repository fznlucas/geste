import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Column gap: 14 px below 1200 px, 40 px from 1200 (boards Shop, MShop). */
const GAP = { base: 14, md: 14, lg: 40 } as const;
/** Ratio of a 4:5 work: the grid is never taller than a full row of them would make it. */
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
  /** Items per row: phones, tablets (≥ 768 px), desktop (≥ 1200 px). */
  perRow?: Record<Breakpoint, number>;
  /** Tallest image per breakpoint, in px (desktop 260 on Shop and Home). A grid whose widest row would pass the container at that height gets shorter, all rows alike. */
  maxHeight?: Partial<Record<Breakpoint, number>>;
  /** Space under each row: "mb-28 lg:mb-64". */
  rowSpace?: string;
  className?: string;
}

/**
 * A grid where every image has the same height, each work as wide as its ratio makes it (Shop, Home,
 * /prints). The height is one for the whole grid at each breakpoint: the one that makes the widest row
 * fill the container (with fixed gaps), capped by `maxHeight` (desktop 260 px), so every row is
 * left-justified and no row passes the container. Desktop `perRow.lg` per row (5), phones 2, tablets 3.
 * Images sit on one line and the captions hang under them, as wide as their image. Pure CSS: every
 * width is set from the grid's widest row per breakpoint, rows end with a line break, so the server
 * render is already right.
 */
export function ProportionalGrid({ items, perRow = { base: 2, md: 3, lg: 5 }, maxHeight = { lg: 260 }, rowSpace = "mb-28 lg:mb-64", className }: ProportionalGridProps) {
  // One height for the whole grid, per breakpoint: the one that makes its widest row fill the line.
  const widest = (bp: Breakpoint) => {
    const n = perRow[bp];
    let max = n * FILLER; // a lone narrow work never grows past a row of 4:5 works
    for (let start = 0; start < items.length; start += n) max = Math.max(max, items.slice(start, start + n).reduce((s, it) => s + it.ratio, 0));
    return max;
  };
  const sums = { base: widest("base"), md: widest("md"), lg: widest("lg") };
  const width = (i: number, bp: Breakpoint) => {
    const n = perRow[bp];
    const r = items[i]!.ratio;
    const fill = `calc((100% - ${(n - 1) * GAP[bp] + 1}px) * ${r / sums[bp]})`;
    const cap = maxHeight[bp];
    return cap ? `min(${cap * r}px, ${fill})` : fill;
  };
  const breakAfter = (i: number, bp: Breakpoint) => (i + 1) % perRow[bp] === 0 && i < items.length - 1;
  return (
    <div className={cn("flex flex-wrap items-start gap-x-14 lg:gap-x-40", className)}>
      {items.map((it, i) => (
        <Fragment key={it.key}>
          <div
            className={cn("w-(--w-base) md:w-(--w-md) lg:w-(--w-lg)", rowSpace)}
            style={{ "--w-base": width(i, "base"), "--w-md": width(i, "md"), "--w-lg": width(i, "lg") } as CSSProperties}
          >
            {it.node}
          </div>
          {/* Row ends, one per breakpoint (zero height, full basis). */}
          {breakAfter(i, "base") && <span aria-hidden="true" className="h-0 basis-full md:hidden" />}
          {breakAfter(i, "md") && <span aria-hidden="true" className="hidden h-0 basis-full md:block lg:hidden" />}
          {breakAfter(i, "lg") && <span aria-hidden="true" className="hidden h-0 basis-full lg:block" />}
        </Fragment>
      ))}
    </div>
  );
}
