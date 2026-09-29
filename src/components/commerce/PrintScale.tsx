import type { CSSProperties } from "react";
import { PRINT_SIZES, type Orientation, type PrintSize } from "@/lib/pricing";
import { PrintPaper } from "./PrintPaper";

/** The scene, in centimetres: a wall section 200 wide × 220 high (the Sand panel's ratio), a 160 cm sideboard on the floor. */
const WALL = { w: 200, h: 220 };
const SIDEBOARD = { w: 160, h: 76, legs: 14 };
/** The print hangs this far above the sideboard, centred on it. */
const GAP = 24;

export interface PrintScaleProps {
  imageUrl: string;
  alt: string;
  orientation: Orientation;
  size: PrintSize;
  /** Printed on the sheet: "N°07 · 12/100". */
  caption: string;
}

const pct = (cm: number, of: number) => `${(cm / of) * 100}%`;

/**
 * Print at its real size on a wall, above a 160 cm sideboard (board Print, "To scale"): the frame is
 * drawn in centimetres, so S, M and L keep their true proportions to the furniture. The size change
 * animates 420 ms (panel), off under prefers-reduced-motion. The wall is the page (Paper); the frame
 * (2 px Ink) holds the print's Sand sheet (PrintPaper); the sideboard is a light silhouette so the
 * print stays the subject.
 */
export function PrintScale({ imageUrl, alt, orientation, size, caption }: PrintScaleProps) {
  const [shortSide, longSide] = PRINT_SIZES[size].cm;
  const [w, h] = orientation === "landscape" ? [longSide, shortSide] : [shortSide, longSide];
  const frame: CSSProperties = {
    width: pct(w, WALL.w),
    height: pct(h, WALL.h),
    left: pct((WALL.w - w) / 2, WALL.w),
    bottom: pct(SIDEBOARD.h + GAP, WALL.h),
  };
  const sideboardLeft = (WALL.w - SIDEBOARD.w) / 2;
  return (
    <div className="relative aspect-[200/220] w-full">
      {/* Framed print: a thin Ink frame around the sheet. */}
      <div className="absolute border-2 border-fg transition-[width,height,left,bottom] duration-panel ease-standard motion-reduce:transition-none" style={frame}>
        <PrintPaper imageUrl={imageUrl} alt={alt} orientation={orientation} caption={caption} className="h-full w-full" sizes="(min-width: 1200px) 320px, 50vw" />
      </div>
      {/* Sideboard silhouette: top, body, two legs. */}
      <svg aria-hidden="true" className="absolute bottom-0 text-border-field" style={{ left: pct(sideboardLeft, WALL.w), width: pct(SIDEBOARD.w, WALL.w), height: pct(SIDEBOARD.h, WALL.h) }} viewBox={`0 0 ${SIDEBOARD.w} ${SIDEBOARD.h}`} preserveAspectRatio="none">
        <rect x="0" y="0" width={SIDEBOARD.w} height={SIDEBOARD.h - SIDEBOARD.legs} fill="currentColor" />
        <rect x="8" y={SIDEBOARD.h - SIDEBOARD.legs} width="4" height={SIDEBOARD.legs} fill="currentColor" />
        <rect x={SIDEBOARD.w - 12} y={SIDEBOARD.h - SIDEBOARD.legs} width="4" height={SIDEBOARD.legs} fill="currentColor" />
      </svg>
      {/* Floor. */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-border-field" />
    </div>
  );
}
