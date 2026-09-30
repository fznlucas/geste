"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface FitLineVariant {
  left: ReactNode;
  /** Right-aligned part (the price). */
  right?: ReactNode;
}

export interface FitLineProps {
  /** Longest first: the first one whose real width fits the line is shown, else the last. */
  variants: FitLineVariant[];
  className?: string;
  style?: CSSProperties;
}

/**
 * One caption line that never wraps (docs/decisions.md "Captions on one line"): it is as wide as its
 * parent (the image) and shows the longest variant that fits. Every variant is laid out in a hidden
 * measurer (no letter-spacing, same font), and the choice is redone when the line resizes and once
 * the fonts are loaded. The server render shows the first variant, clipped until the browser measures.
 * Decorative text: the full wording belongs in the link's aria-label.
 */
export function FitLine({ variants, className, style }: FitLineProps) {
  const box = useRef<HTMLSpanElement>(null);
  const measurer = useRef<HTMLSpanElement>(null);
  const [pick, setPick] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    const m = measurer.current;
    if (!el || !m) return;
    const fit = () => {
      // Fractional width: grids size cards to the sub-pixel, clientWidth would round a fitting wording away.
      const width = el.getBoundingClientRect().width;
      if (width === 0) return; // hidden at this breakpoint: measured when it shows
      const rows = Array.from(m.children) as HTMLElement[];
      const i = rows.findIndex((r) => r.getBoundingClientRect().width <= width + 0.5);
      setPick(i === -1 ? rows.length - 1 : i);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [variants]);

  const row = (v: FitLineVariant) => (
    <>
      <span>{v.left}</span>
      {v.right !== undefined && <span className="ml-auto">{v.right}</span>}
    </>
  );
  const shown = variants[Math.min(pick, variants.length - 1)]!;
  return (
    <span ref={box} data-fit-line="" className={cn("relative flex justify-between gap-x-8 overflow-hidden whitespace-nowrap", className)} style={style}>
      {row(shown)}
      <span ref={measurer} data-fit-measure="" aria-hidden="true" className="invisible absolute left-0 top-0 flex flex-col" style={{ letterSpacing: 0 }}>
        {variants.map((v, i) => (
          <span key={i} className="flex w-max gap-x-8">
            {row(v)}
          </span>
        ))}
      </span>
    </span>
  );
}
