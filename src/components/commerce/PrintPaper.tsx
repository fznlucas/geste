import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Orientation } from "@/lib/pricing";

/** A print's sheet: the paper sizes (A3, A2, 50 × 70) are all ≈ 5:7, turned for a landscape work. */
export const SHEET_RATIO = { portrait: 5 / 7, landscape: 7 / 5 } as const;

/** Margins, as a share of the sheet's short side: 8 % around the work, 15 % at the bottom (the caption sits there). */
const MARGIN = 0.08;
const BOTTOM = 0.15;
/** Caption size: 2.8 % of the sheet's height, so every sheet of a row (same height) prints the same size. In cqw of the sheet's width. */
const TYPE = { portrait: `${2.8 * (7 / 5)}cqw`, landscape: `${2.8 * (5 / 7)}cqw` } as const;

export interface PrintPaperProps {
  imageUrl: string;
  alt: string;
  orientation: Orientation;
  /** Left of the caption: "N°06 · Edition of 100", "N°07 · 12/100". "Geste Studio" is on the right. */
  caption: string;
  className?: string;
  sizes: string;
  priority?: boolean;
  imgClassName?: string;
}

/**
 * A print as a sheet of cotton paper (Sand, the brand's paper tone), straight on the page: no
 * outline, no shadow. The work is whole inside an 8 % margin, a little more at the bottom where the
 * caption is printed in Ink (Stone fails contrast on Sand), "N°06 · Edition of 100" left and
 * "Geste Studio" right, in `text-sheet` (2.8 % of the sheet's height, 6 to 12 px; left out on a sheet
 * narrower than 150 px, where it would not fit). Fills the width of
 * `className`; the height follows the paper's ratio.
 */
export function PrintPaper({ imageUrl, alt, orientation, caption, className, sizes, priority, imgClassName }: PrintPaperProps) {
  const ratio = SHEET_RATIO[orientation];
  // Offsets in % of each side: the short side is the width (portrait) or the height (landscape).
  const short = orientation === "portrait" ? { x: 1, y: ratio } : { x: 1 / ratio, y: 1 };
  const pct = (share: number, k: number) => `${share * k * 100}%`;
  return (
    <span className={cn("relative block bg-surface-sunk @container", className)} style={{ aspectRatio: ratio, "--sheet-type": TYPE[orientation] } as CSSProperties}>
      <span className="absolute" style={{ left: pct(MARGIN, short.x), right: pct(MARGIN, short.x), top: pct(MARGIN, short.y), bottom: pct(BOTTOM, short.y) }}>
        <Image src={imageUrl} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-contain", imgClassName)} />
      </span>
      <span
        // Under 150 px of sheet the caption would need less than 6 px: the sheet keeps its margin, without it.
        className="absolute flex items-center justify-between gap-8 whitespace-nowrap text-sheet text-fg @max-[150px]:hidden"
        style={{ left: pct(MARGIN, short.x), right: pct(MARGIN, short.x), bottom: 0, height: pct(BOTTOM, short.y) }}
      >
        <span>{caption}</span>
        <span>Geste Studio</span>
      </span>
    </span>
  );
}
