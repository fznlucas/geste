"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export interface CartLineProps {
  item: CartItem;
  /** Title link (the work page with the same configuration, the print page). */
  href?: string | null;
  /** Second grey line: "+ shopping list", "Signed, with certificate". Not shown on the phone cart page. */
  note?: string | null;
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
 * Cart row (boards Cart, MCart): thumb, title link + price on one line, detail and note in Stone,
 * "Remove" text button. Guides and gift cards have quantity 1; prints get a stepper up to the stock.
 */
export function CartLine({ item, href, note, issue, onRemove, onQuantity, maxQuantity, size = "md", onNavigate }: CartLineProps) {
  const lg = size === "lg";
  return (
    <div className={lg ? "flex gap-14 border-b border-border py-14" : "flex gap-16 border-b border-border py-16"}>
      <span className={lg ? "relative block h-90 w-72 shrink-0 bg-surface-muted" : "relative block h-80 w-64 shrink-0 bg-surface-muted"}>
        {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes={lg ? "72px" : "64px"} className={issue ? "object-cover opacity-40" : "object-cover"} />}
      </span>
      <span className="flex flex-1 flex-col gap-2">
        <span className="flex justify-between gap-12">
          {href ? (
            <Link href={href} onClick={onNavigate} className="underline underline-offset-3 hover:text-fg-muted">{item.title}</Link>
          ) : (
            <span>{item.title}</span>
          )}
          <span className={issue ? "tabular-nums text-fg-muted line-through" : "tabular-nums"}>{formatPrice(item.unitPriceCents * item.quantity)}</span>
        </span>
        {item.detail && <span className="text-fg-muted">{item.detail}</span>}
        {note && !lg && <span className="text-fg-muted">{note}</span>}
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
