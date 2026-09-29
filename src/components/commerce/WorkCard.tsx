"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Artwork } from "./Artwork";
import { PriceMorph } from "./PriceMorph";
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
 * Work tile: 4:5 frame (208 × 260 on desktop) with the work whole on Mist, landscape works included;
 * no shadow, no image hover, the whole tile is one link. "Signature" works carry the word on the frame.
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
      orientation={work.orientation}
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

export interface PrintEditionCardProps {
  href: string;
  imageUrl: string;
  orientation: Orientation;
  /** "N°07" */
  number: string;
  /** "S" */
  size: string;
  /** "12/100", or null when sold out */
  next: string | null;
  /** "$55" */
  price: string;
  priority?: boolean;
  alwaysShowMeta?: boolean;
}

/**
 * One print edition in the /prints gallery: the Shop's card (same frame, grid and hover), with
 * "N°07 · S · 12/100" and the price. Sold out: image at 60%, "Sold out" replaces the price.
 */
export function PrintEditionCard({ href, imageUrl, orientation, number, size, next, price, priority, alwaysShowMeta }: PrintEditionCardProps) {
  const soldOut = next === null;
  const shown = soldOut ? "Sold out" : price;
  const meta = `${number} · ${size}${next ? ` · ${next}` : ""}`;
  return (
    <CardTile
      href={href}
      label={`${number} print, size ${size}, ${soldOut ? "sold out" : `edition ${next}, ${price}`}`}
      imageUrl={imageUrl}
      imageAlt={`${number}, limited print`}
      orientation={orientation}
      dim={soldOut}
      priority={priority}
      alwaysShowMeta={alwaysShowMeta}
      title={number}
      meta={meta}
      shortMeta={meta}
      price={shown}
    />
  );
}

interface CardTileProps {
  href: string;
  label: string;
  imageUrl: string;
  imageAlt: string;
  orientation: Orientation;
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

function CardTile({ href, label, imageUrl, imageAlt, orientation, badge, dim, priority, variant = "shop", alwaysShowMeta, title, meta, shortMeta, price }: CardTileProps) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={`group flex w-full flex-col gap-8 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-8 lg:w-208 ${variant === "home" ? "lg:gap-10" : "lg:gap-12"}`}
    >
      <span className="relative block w-full">
        <Artwork src={imageUrl} alt={imageAlt} orientation={orientation} frame="card" className="w-full" sizes="(min-width: 1200px) 208px, 50vw" priority={priority} imgStyle={{ opacity: dim ? 0.6 : 1 }} />
        {badge && <span aria-hidden="true" className="absolute left-8 top-8 bg-bg px-6 py-2 lg:left-10 lg:top-10 lg:px-7 lg:py-3">{badge}</span>}
      </span>
      {/* Phone and tablet: no hover, the line is always there. */}
      <span aria-hidden="true" className="flex justify-between gap-8 whitespace-nowrap lg:hidden">
        <span className="text-fg-muted">{shortMeta}</span>
        <span>{price}</span>
      </span>
      {variant === "home" ? (
        <span aria-hidden="true" className="hidden flex-col gap-10 lg:flex">
          <span className="flex justify-between">
            <span className="underline-offset-3 group-hover:underline">{title}</span>
            <span>{price}</span>
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
