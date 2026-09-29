import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Column gap: 14 px below 1200 px, 40 px from 1200 (boards Shop, MShop). */
const GAP = { base: 14, md: 14, lg: 40 } as const;
/** Ratio that fills the empty places of a short row on phones and tablets (a 4:5 work). */
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
  /** Tallest image per breakpoint, in px (desktop 260 on Shop and Home). A row too wide at that height gets shorter. */
  maxHeight?: Partial<Record<Breakpoint, number>>;
  /** Space under each row: "mb-28 lg:mb-64". */
  rowSpace?: string;
  className?: string;
}

/**
 * Rows of works that share one image height, each work as wide as its ratio makes it (Shop, Home,
 * /prints). Desktop: `perRow.lg` per row at `maxHeight.lg`, fixed 40 px gaps, left-justified; a row
 * that would pass the container is scaled down so it fits. Phones and tablets: the row fills the
 * width, so the two (or three) images of a row have the same height. Images sit on one line and the
 * captions hang under them, as wide as their image. Pure CSS: every width is set from its row's
 * ratios per breakpoint, rows end with a line break, so the server render is already right.
 */
export function ProportionalGrid({ items, perRow = { base: 2, md: 3, lg: 5 }, maxHeight = { lg: 260 }, rowSpace = "mb-28 lg:mb-64", className }: ProportionalGridProps) {
  const width = (i: number, bp: Breakpoint) => {
    const n = perRow[bp];
    const start = Math.floor(i / n) * n;
    const row = items.slice(start, start + n);
    // Desktop rows keep their real sum (short rows stay at the full height); smaller screens fill the row.
    const sum = row.reduce((s, it) => s + it.ratio, 0) + (bp === "lg" ? 0 : (n - row.length) * FILLER);
    const r = items[i]!.ratio;
    const fill = `calc((100% - ${(n - 1) * GAP[bp] + 1}px) * ${r / sum})`;
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
