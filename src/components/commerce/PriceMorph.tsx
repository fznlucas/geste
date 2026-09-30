import { priceMorph } from "@/lib/motion";
import type { ReactNode } from "react";
import { FitLine } from "./FitLine";

export interface PriceMorphProps {
  visible: boolean;
  meta: ReactNode;
  price: ReactNode;
  /** Shorter wordings, longest first, for a narrow image ("Inter. · 3h30", "Inter.", price kept): see FitLine. */
  shorter?: Array<{ meta: ReactNode; price: ReactNode }>;
}

/**
 * The meta line under a work: "Intermediate · 3h30" left (Stone), "from $15" right (Ink), on one line
 * as wide as its image (FitLine picks the longest wording that fits).
 * Hidden: opacity 0, blur 4 px, tracking .25em, 3 px down. Shown: all to 0. 380/440 ms standard ease.
 * Reduced motion: switches instantly (durations are 0 via CSS vars).
 */
export function PriceMorph({ visible, meta, price, shorter = [] }: PriceMorphProps) {
  const s = visible ? priceMorph.shown : priceMorph.hidden;
  return (
    <FitLine
      className="h-14 text-xs leading-[14px]"
      style={{
        opacity: s.opacity,
        filter: `blur(${s.blur}px)`,
        letterSpacing: `${s.letterSpacing}em`,
        transform: `translateY(${s.y}px)`,
        transition: priceMorph.transition,
      }}
      variants={[{ meta, price }, ...shorter].map((v) => ({ left: <span className="text-fg-muted">{v.meta}</span>, right: v.price }))}
    />
  );
}
