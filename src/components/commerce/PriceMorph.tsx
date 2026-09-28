import { priceMorph } from "@/lib/motion";
import type { ReactNode } from "react";

/**
 * The meta line under a work: "Intermediate · 3h30" left (Stone), "from $12" right (Ink).
 * Hidden: opacity 0, blur 4 px, tracking .25em, 3 px down. Shown: all to 0. 380/440 ms standard ease.
 * Reduced motion: switches instantly (durations are 0 via CSS vars).
 */
export function PriceMorph({ visible, meta, price }: { visible: boolean; meta: ReactNode; price: ReactNode }) {
  const s = visible ? priceMorph.shown : priceMorph.hidden;
  return (
    <span
      className="flex h-14 justify-between whitespace-nowrap text-xs leading-[14px]"
      style={{
        opacity: s.opacity,
        filter: `blur(${s.blur}px)`,
        letterSpacing: `${s.letterSpacing}em`,
        transform: `translateY(${s.y}px)`,
        transition: priceMorph.transition,
      }}
    >
      <span className="text-fg-muted">{meta}</span>
      <span>{price}</span>
    </span>
  );
}
