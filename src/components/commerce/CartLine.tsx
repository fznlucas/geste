"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";
import { Artwork } from "./Artwork";

export interface CartLineProps {
  item: CartItem;
  /** Title link (the work page with the same configuration, the print page). */
  href?: string | null;
  /** Second grey line: "+ shopping list", "Signed, with certificate". Not shown on the phone cart page. */
  note?: string | null;
  /** "−15% with the print": the line is in a guide + print bundle (`item.discountCents`). Always shown. */
  bundleNote?: string | null;
  /** Why the line is not counted ("Sold out, not counted"). Signal text, never colour alone. */
  issue?: string | null;
  onRemove: () => void;
  onQuantity?: (q: number) => void;
  maxQuantity?: number;
  /** md = cart drawer (64×80 thumb, board Cart). lg = phone cart page (72×90, board MCart, no note). */
  size?: "md" | "lg";
  /** Called when the title link is followed (closes the drawer). */
  onNavigate?: () => void;
}

/**
 * Cart row (boards Cart, MCart): thumb (turned for a landscape work), title link + price on one line,
 * detail and note in Stone, "Remove" text button. Guides and gift cards have quantity 1; prints get a
 * stepper up to the stock. A bundled line shows its full price struck, the discounted price and why.
 */
export function CartLine({ item, href, note, bundleNote, issue, onRemove, onQuantity, maxQuantity, size = "md", onNavigate }: CartLineProps) {
  const lg = size === "lg";
  const full = item.unitPriceCents * item.quantity;
  const discount = !issue && item.discountCents ? item.discountCents : 0;
  return (
    <div className={lg ? "flex gap-14 border-b border-border py-14" : "flex gap-16 border-b border-border py-16"}>
      {item.imageUrl ? (
        <Artwork src={item.imageUrl} orientation={item.orientation} className={lg ? "w-72" : "w-64"} sizes={lg ? "72px" : "64px"} imgClassName={issue ? "opacity-40" : undefined} />
      ) : (
        <span className={lg ? "block h-90 w-72 shrink-0 bg-surface-muted" : "block h-80 w-64 shrink-0 bg-surface-muted"} />
      )}
      <span className="flex flex-1 flex-col gap-2">
        <span className="flex justify-between gap-12">
          {href ? (
            <Link href={href} onClick={onNavigate} className="underline underline-offset-3 hover:text-fg-muted">{item.title}</Link>
          ) : (
            <span>{item.title}</span>
          )}
          {discount ? (
            <span className="flex gap-8 whitespace-nowrap tabular-nums">
              <s className="text-fg-muted" aria-label={`was ${formatPrice(full)}`}>{formatPrice(full)}</s>
              <span>{formatPrice(full - discount)}</span>
            </span>
          ) : (
            <span className={issue ? "tabular-nums text-fg-muted line-through" : "tabular-nums"}>{formatPrice(full)}</span>
          )}
        </span>
        {item.detail && <span className="text-fg-muted">{item.detail}</span>}
        {note && !lg && <span className="text-fg-muted">{note}</span>}
        {discount > 0 && bundleNote && <span>{bundleNote}</span>}
        {issue && <span role="status" className="text-danger">{issue}</span>}
        <span className={lg ? "flex items-center gap-14" : "mt-4 flex items-center gap-14"}>
          {item.kind === "print" && onQuantity && !issue && (
            <span className="flex items-center gap-8" role="group" aria-label="Quantity">
              <button type="button" aria-label="One less" disabled={item.quantity <= 1} onClick={() => onQuantity(item.quantity - 1)} className="min-h-32 min-w-32 disabled:opacity-40">−</button>
              <span aria-live="polite" className="tabular-nums">{item.quantity}</span>
              <button type="button" aria-label="One more" disabled={maxQuantity !== undefined && item.quantity >= maxQuantity} onClick={() => onQuantity(item.quantity + 1)} className="min-h-32 min-w-32 disabled:opacity-40">+</button>
            </span>
          )}
          <button type="button" onClick={onRemove} aria-label={`Remove ${item.title}`} className="min-h-32 text-fg-muted underline underline-offset-3 hover:text-fg">Remove</button>
        </span>
      </span>
    </div>
  );
}
