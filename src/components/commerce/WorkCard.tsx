"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Artwork } from "./Artwork";
import { FitLine, type FitLineVariant } from "./FitLine";
import { PriceMorph } from "./PriceMorph";
import { PrintPaper } from "./PrintPaper";
import { formatPrice, fromPrice } from "@/lib/format";
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
 * gives it (ProportionalGrid: one height for the whole grid, 260 px at most on desktop); no shadow, no
 * image hover, the whole tile is one link. "Signature" works carry the word on the image.
 * Desktop shop: only the meta line morphs in on hover or keyboard focus. Desktop home: "N°01   from $15"
 * then "Beginner · 1h30". Phone (< 1200 px, no hover): one line "Beg. · 1h30   from $15".
 * Every caption line is one line as wide as the image: when it does not fit, "from $31" → "$31", then
 * the time goes, then the level is shortened (docs/decisions.md "Captions on one line"). The full
 * wording is the link's aria-label. Sold out: image at 60%, "Sold out" replaces the price.
 */
export function WorkCard({ work, variant = "shop", alwaysShowMeta, priority }: WorkCardProps) {
  const [hover, setHover] = useState(false);
  const soldOut = !!work.soldOut;
  const price = soldOut ? "Sold out" : fromPrice(work.fromPriceCents);
  const bare = soldOut ? "Sold out" : formatPrice(work.fromPriceCents);
  const level = work.levelLabel;
  const time = work.duration;
  // Desktop shop line (meta + price), longest first.
  const desktop = [
    { meta: `${level} · ${time}`, price },
    { meta: `${level} · ${time}`, price: bare },
    { meta: level, price: bare },
    { meta: short(level), price: bare },
  ];
  // Phones start from the boards' short level ("Beg. · 1h30").
  const phone: FitLineVariant[] = [
    { left: `${short(level)} · ${time}`, right: price },
    { left: `${short(level)} · ${time}`, right: bare },
    { left: short(level), right: bare },
  ].map((v) => ({ left: <span className="text-fg-muted">{v.left}</span>, right: v.right }));
  return (
    <Link
      href={`/works/${work.slug}`}
      aria-label={`${work.number}${work.signature ? ", Signature" : ""}, ${level}, ${time}, ${price}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={`group flex w-full flex-col gap-8 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-8 ${variant === "home" ? "lg:gap-10" : "lg:gap-12"}`}
    >
      <span className="relative block w-full">
        <Artwork src={work.imageUrl} alt={work.imageAlt} ratio={work.imageRatio} className="w-full" sizes="(min-width: 1200px) 340px, 60vw" priority={priority} imgStyle={{ opacity: soldOut ? 0.6 : 1 }} />
        {work.signature && <span aria-hidden="true" className="absolute left-8 top-8 bg-bg px-6 py-2 lg:left-10 lg:top-10 lg:px-7 lg:py-3">Signature</span>}
      </span>
      {/* Phone and tablet: no hover, the line is always there. */}
      <span aria-hidden="true" className="lg:hidden">
        <FitLine variants={phone} />
      </span>
      {variant === "home" ? (
        <span aria-hidden="true" className="hidden flex-col gap-10 lg:flex">
          <FitLine variants={[price, bare].map((p) => ({ left: <span className="underline-offset-3 group-hover:underline">{work.number}</span>, right: p }))} />
          <FitLine variants={[`${level} · ${time}`, level, short(level)].map((m) => ({ left: <span className="text-fg-muted">{m}</span> }))} />
        </span>
      ) : (
        <span aria-hidden="true" className="hidden lg:block">
          <PriceMorph visible={alwaysShowMeta || hover} meta={desktop[0]!.meta} price={desktop[0]!.price} shorter={desktop.slice(1)} />
        </span>
      )}
    </Link>
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
  /** Cheapest size with copies left, in cents; null when every size is sold out. */
  fromCents: number | null;
  priority?: boolean;
}

/**
 * One work in the /prints gallery, shown as a print: the Sand sheet (PrintPaper), then one line
 * "N°06   S · M · L   from $55" (sold-out sizes struck). When the line does not fit its sheet: "$55",
 * then "S·M·L", then the sizes go ("Sold out" → "Sold" last). The grid gives it its width (ProportionalGrid). Every size sold out:
 * the work at 60 % and "Sold out".
 */
export function PrintWorkCard({ href, imageUrl, orientation, number, editionSize, sizes, fromCents, priority }: PrintWorkCardProps) {
  const allSold = fromCents === null;
  const price = allSold ? "Sold out" : fromPrice(fromCents);
  const bare = allSold ? "Sold out" : formatPrice(fromCents);
  const label = `${number} print, ${sizes.map((z) => `${z.size}${z.soldOut ? " sold out" : ""}`).join(", ")}, ${price}`;
  const num = <span className="underline-offset-3 group-hover:underline">{number}</span>;
  const withSizes = (sep: string): ReactNode => (
    <span className="flex gap-x-8">
      {num}
      <span className="text-fg-muted">
        {sizes.map((z, i) => (
          <span key={z.size}>
            {i > 0 && sep}
            {z.soldOut ? <s>{z.size}</s> : z.size}
          </span>
        ))}
      </span>
    </span>
  );
  return (
    <Link href={href} aria-label={label} className="group flex w-full flex-col gap-8 focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-8 lg:gap-12">
      <PrintPaper imageUrl={imageUrl} alt={`${number}, limited print`} orientation={orientation} caption={`${number} · Edition of ${editionSize}`} className="w-full" imgClassName={allSold ? "opacity-60" : undefined} sizes="(min-width: 1200px) 300px, 50vw" priority={priority} />
      <span aria-hidden="true">
        <FitLine
          variants={[
            { left: withSizes(" · "), right: price },
            { left: withSizes(" · "), right: bare },
            { left: withSizes("·"), right: bare },
            { left: num, right: bare },
            // A sold-out work on the narrowest phone sheets (88 px).
            ...(allSold ? [{ left: num, right: "Sold" }] : []),
          ]}
        />
      </span>
    </Link>
  );
}
