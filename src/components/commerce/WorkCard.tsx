"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PriceMorph } from "./PriceMorph";
import { fromPrice } from "@/lib/format";
import type { Work } from "@/lib/types";

export interface WorkCardProps {
  work: Work;
  /** shop = boards Shop / MShop (meta morphs in on hover). home = board Home "New works" (number, price and meta always shown). */
  variant?: "shop" | "home";
  /** Desktop shop card: keep the meta line visible (kit, tests). Phones always show it. */
  alwaysShowMeta?: boolean;
  priority?: boolean;
}

/** "Beginner" → "Beg." (MShop, MHome). */
const short = (level: string) => `${level.slice(0, 3)}.`;

/**
 * Work tile: 4:5 crop (208 × 260 on desktop), no shadow, no image hover, the whole tile is one link.
 * Desktop shop: only the meta line morphs in on hover or keyboard focus. Desktop home: "N°01   from $12"
 * then "Beginner · 1h30". Phone (< 1200 px, no hover): one line "Beg. · 1h30   from $12".
 * Sold out: image at 60%, "Sold out" replaces the price.
 */
export function WorkCard({ work, variant = "shop", alwaysShowMeta, priority }: WorkCardProps) {
  const [hover, setHover] = useState(false);
  const price = work.soldOut ? "Sold out" : fromPrice(work.fromPriceCents);
  return (
    <Link
      href={`/works/${work.slug}`}
      aria-label={`${work.number}, ${work.levelLabel}, ${work.duration}, ${price}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={`group flex w-full flex-col gap-8 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-8 lg:w-208 ${variant === "home" ? "lg:gap-10" : "lg:gap-12"}`}
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-muted">
        <Image src={work.imageUrl} alt={work.imageAlt} fill sizes="(min-width: 1200px) 208px, 50vw" priority={priority} className="object-cover" style={{ opacity: work.soldOut ? 0.6 : 1 }} />
      </span>
      {/* Phone and tablet: no hover, the line is always there. */}
      <span aria-hidden="true" className="flex justify-between gap-8 whitespace-nowrap lg:hidden">
        <span className="text-fg-muted">{short(work.levelLabel)} · {work.duration}</span>
        <span>{price}</span>
      </span>
      {variant === "home" ? (
        <span aria-hidden="true" className="hidden flex-col gap-10 lg:flex">
          <span className="flex justify-between">
            <span className="underline-offset-3 group-hover:underline">{work.number}</span>
            <span>{price}</span>
          </span>
          <span className="text-fg-muted">{work.levelLabel} · {work.duration}</span>
        </span>
      ) : (
        <span aria-hidden="true" className="hidden lg:block">
          <PriceMorph visible={alwaysShowMeta || hover} meta={`${work.levelLabel} · ${work.duration}`} price={price} />
        </span>
      )}
    </Link>
  );
}
