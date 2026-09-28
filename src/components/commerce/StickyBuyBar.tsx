"use client";

import { useEffect, useState, type RefObject } from "react";
import { Button } from "../primitives/Button";

/**
 * Phone product page: once the in-page Buy button scrolls out of view, a bar slides up from the
 * bottom (420 ms): title + config on the left, primary price button on the right. Hidden again
 * when the original button is visible. Uses IntersectionObserver on `watch`.
 */
export function StickyBuyBar({ watch, title, detail, price, onAdd }: { watch: RefObject<HTMLElement | null>; title: string; detail: string; price: string; onAdd: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e?.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);
  return (
    <div
      aria-hidden={!show}
      className="fixed inset-x-0 bottom-0 z-sticky flex items-center justify-between gap-12 border-t border-border bg-bg px-16 py-10 transition-transform duration-panel ease-standard lg:hidden"
      style={{ transform: show ? "translateY(0)" : "translateY(100%)" }}
    >
      <span className="flex flex-col leading-[16px]">
        <span>{title}</span>
        <span className="text-fg-muted">{detail}</span>
      </span>
      <Button onClick={onAdd} trailing={price} tabIndex={show ? 0 : -1} className="min-w-180">
        Add
      </Button>
    </div>
  );
}
