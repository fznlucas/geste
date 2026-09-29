"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Artwork } from "./Artwork";
import { PriceMorph } from "./PriceMorph";
import { PrintPaper } from "./PrintPaper";
import { fromPrice } from "@/lib/format";
import type { Orientation } from "@/lib/pricing";
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
 * Work tile: the work whole on the page at its own ratio (no ground, no crop), as wide as the grid
 * gives it (ProportionalGrid: one height per row, 260 px on desktop); no shadow, no image hover, the
 * whole tile is one link. "Signature" works carry the word on the image.
 * Desktop shop: only the meta line morphs in on hover or keyboard focus. Desktop home: "N°01   from $15"
 * then "Beginner · 1h30". Phone (< 1200 px, no hover): one line "Beg. · 1h30   from $15".
 * Sold out: image at 60%, "Sold out" replaces the price.
 */
export function WorkCard({ work, variant = "shop", alwaysShowMeta, priority }: WorkCardProps) {
  const price = work.soldOut ? "Sold out" : fromPrice(work.fromPriceCents);
  return (
    <CardTile
      href={`/works/${work.slug}`}
      label={`${work.number}${work.signature ? ", Signature" : ""}, ${work.levelLabel}, ${work.duration}, ${price}`}
      imageUrl={work.imageUrl}
      imageAlt={work.imageAlt}
      ratio={work.imageRatio}
      badge={work.signature ? "Signature" : null}
      dim={!!work.soldOut}
      priority={priority}
      variant={variant}
      alwaysShowMeta={alwaysShowMeta}
      title={work.number}
      meta={`${work.levelLabel} · ${work.duration}`}
      shortMeta={`${short(work.levelLabel)} · ${work.duration}`}
      price={price}
    />
  );
}

export interface PrintWorkCardProps {
  href: string;
  imageUrl: string;
  orientation: Orientation;
  /** "N°06" */
  number: string;
  /** Edition size of the smallest size on sale, printed on the sheet: "Edition of 100". */
  editionSize: number;
  /** S, M, L in order; sold-out sizes are struck. */
  sizes: Array<{ size: string; soldOut: boolean }>;
  /** "from $55", or "Sold out" when every size is. */
  price: string;
  priority?: boolean;
}

/**
 * One work in the /prints gallery, shown as a print: the Sand sheet (PrintPaper) with "N°06 · Edition
 * of 100" and "Geste Studio" printed at the bottom, then "N°06   S · M · L" (sold-out sizes struck) and
 * the price under it. The grid gives it its width (ProportionalGrid). Every size sold out: the work at
 * 60 % (the printed caption keeps its contrast).
 */
export function PrintWorkCard({ href, imageUrl, orientation, number, editionSize, sizes, price, priority }: PrintWorkCardProps) {
  const allSold = sizes.every((z) => z.soldOut);
  const label = `${number} print, ${sizes.map((z) => `${z.size}${z.soldOut ? " sold out" : ""}`).join(", ")}, ${price}`;
  return (
    <Link href={href} aria-label={label} className="group flex w-full flex-col gap-8 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-8 lg:gap-12">
      <PrintPaper imageUrl={imageUrl} alt={`${number}, limited print`} orientation={orientation} caption={`${number} · Edition of ${editionSize}`} className="w-full" imgClassName={allSold ? "opacity-60" : undefined} sizes="(min-width: 1200px) 300px, 50vw" priority={priority} />
      <span aria-hidden="true" className="flex flex-wrap justify-between gap-x-8">
        <span className="flex flex-wrap gap-x-8">
          <span className="underline-offset-3 group-hover:underline">{number}</span>
          <span className="text-fg-muted">
            {sizes.map((z, i) => (
              <span key={z.size}>
                {i > 0 && " · "}
                {z.soldOut ? <s>{z.size}</s> : z.size}
              </span>
            ))}
          </span>
        </span>
        <span className="ml-auto">{price}</span>
      </span>
    </Link>
  );
}

interface CardTileProps {
  href: string;
  label: string;
  imageUrl: string;
  imageAlt: string;
  ratio: number;
  badge?: ReactNode;
  dim: boolean;
  priority?: boolean;
  variant?: "shop" | "home";
  alwaysShowMeta?: boolean;
  title: string;
  meta: string;
  shortMeta: string;
  price: string;
}

function CardTile({ href, label, imageUrl, imageAlt, ratio, badge, dim, priority, variant = "shop", alwaysShowMeta, title, meta, shortMeta, price }: CardTileProps) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={`group flex w-full flex-col gap-8 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-8 ${variant === "home" ? "lg:gap-10" : "lg:gap-12"}`}
    >
      <span className="relative block w-full">
        <Artwork src={imageUrl} alt={imageAlt} ratio={ratio} className="w-full" sizes="(min-width: 1200px) 340px, 60vw" priority={priority} imgStyle={{ opacity: dim ? 0.6 : 1 }} />
        {badge && <span aria-hidden="true" className="absolute left-8 top-8 bg-bg px-6 py-2 lg:left-10 lg:top-10 lg:px-7 lg:py-3">{badge}</span>}
      </span>
      {/* Phone and tablet: no hover, the line is always there. As wide as the image: the price wraps under a narrow one. */}
      <span aria-hidden="true" className="flex flex-wrap justify-between gap-x-8 lg:hidden">
        <span className="whitespace-nowrap text-fg-muted">{shortMeta}</span>
        <span className="ml-auto whitespace-nowrap">{price}</span>
      </span>
      {variant === "home" ? (
        <span aria-hidden="true" className="hidden flex-col gap-10 lg:flex">
          <span className="flex flex-wrap justify-between gap-x-8">
            <span className="underline-offset-3 group-hover:underline">{title}</span>
            <span className="ml-auto">{price}</span>
          </span>
          <span className="text-fg-muted">{meta}</span>
        </span>
      ) : (
        <span aria-hidden="true" className="hidden lg:block">
          <PriceMorph visible={alwaysShowMeta || hover} meta={meta} price={price} />
        </span>
      )}
    </Link>
  );
}
