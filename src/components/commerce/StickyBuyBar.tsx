"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "../primitives/Button";

export interface StickyBuyBarProps {
  /** "N°03 · 60×80" */
  title: string;
  /** "Guide + list" */
  detail: string;
  price: string;
  onAdd: () => void;
  added?: boolean;
  /** When given, the bar only slides in once this element leaves the viewport. Without it, it is always there (board MProduct). */
  watch?: RefObject<HTMLElement | null>;
}

/**
 * Phone work page (< 1200 px): bar pinned to the bottom, title + config on the left, primary
 * "Add   $19" filling the rest. Padding 12 16 24, Line rule on top. Slides 420 ms when `watch` is used.
 */
export function StickyBuyBar({ watch, title, detail, price, onAdd, added }: StickyBuyBarProps) {
  const [hidden, setHidden] = useState(!!watch);
  const bar = useRef<HTMLDivElement>(null);
  // Toasts sit above the bar while it shows (--sticky-bar-h, read by ToastProvider).
  useEffect(() => {
    const root = document.documentElement.style;
    if (hidden || !bar.current) {
      root.removeProperty("--sticky-bar-h");
      return;
    }
    const el = bar.current;
    const ro = new ResizeObserver(() => root.setProperty("--sticky-bar-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.removeProperty("--sticky-bar-h");
    };
  }, [hidden]);
  useEffect(() => {
    const el = watch?.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHidden(!!e?.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  return (
    <div
      ref={bar}
      data-sticky-buy-bar=""
      aria-hidden={hidden}
      className="fixed inset-x-0 bottom-0 z-sticky flex items-center gap-12 border-t border-border bg-bg px-16 pb-24 pt-12 transition-transform duration-panel ease-standard lg:hidden"
      style={{ transform: hidden ? "translateY(100%)" : "translateY(0)" }}
    >
      <span className="flex flex-col whitespace-nowrap leading-[16px]">
        <span>{title}</span>
        <span className="text-fg-muted">{detail}</span>
      </span>
      <Button onClick={onAdd} trailing={added ? "✓" : price} tabIndex={hidden ? -1 : 0} className="flex-1">
        {added ? "Added" : "Add"}
      </Button>
    </div>
  );
}
