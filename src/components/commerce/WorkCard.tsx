"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PriceMorph } from "./PriceMorph";
import { fromPrice } from "@/lib/format";
import type { Work } from "@/lib/types";

export interface WorkCardProps {
  work: Work;
  /** On touch screens the meta line is always visible (no hover). */
  alwaysShowMeta?: boolean;
  priority?: boolean;
}

/**
 * Shop tile: 208 × 260 crop (4:5), no shadow, no image hover. Only the meta line morphs in on
 * hover or keyboard focus. The whole tile is one link. Sold out: image at 60%, "Sold out" replaces the price.
 */
export function WorkCard({ work, alwaysShowMeta, priority }: WorkCardProps) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={`/works/${work.slug}`}
      aria-label={`${work.number}, ${work.levelLabel}, ${work.duration}, ${fromPrice(work.fromPriceCents)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="flex w-full flex-col gap-12 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-8 lg:w-208"
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-muted">
        <Image src={work.imageUrl} alt={work.imageAlt} fill sizes="(min-width: 1200px) 208px, 50vw" priority={priority} className="object-cover" style={{ opacity: work.soldOut ? 0.6 : 1 }} />
      </span>
      <PriceMorph
        visible={alwaysShowMeta || hover}
        meta={`${work.levelLabel} · ${work.duration}`}
        price={work.soldOut ? "Sold out" : fromPrice(work.fromPriceCents)}
      />
    </Link>
  );
}
