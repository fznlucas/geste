"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";

/**
 * Cart row: 56×70 thumb, title + detail (Stone), price right, "Remove" text button.
 * Guides and gift cards have quantity 1 (no stepper); prints can have a stepper up to the edition stock.
 */
export function CartLine({ item, onRemove, onQuantity, maxQuantity }: { item: CartItem; onRemove: () => void; onQuantity?: (q: number) => void; maxQuantity?: number }) {
  return (
    <div className="grid grid-cols-[56px_1fr_auto] gap-12 border-b border-border py-16">
      <span className="relative block h-70 w-56 bg-surface-muted">
        {item.imageUrl && <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
      </span>
      <span className="flex flex-col">
        <span>{item.title}</span>
        <span className="text-fg-muted">{item.detail}</span>
        <span className="mt-8 flex items-center gap-14">
          {item.kind === "print" && onQuantity && (
            <span className="flex items-center gap-8" aria-label="Quantity">
              <button type="button" aria-label="One less" disabled={item.quantity <= 1} onClick={() => onQuantity(item.quantity - 1)} className="min-h-32 min-w-32 disabled:opacity-40">−</button>
              <span aria-live="polite" className="tabular-nums">{item.quantity}</span>
              <button type="button" aria-label="One more" disabled={maxQuantity !== undefined && item.quantity >= maxQuantity} onClick={() => onQuantity(item.quantity + 1)} className="min-h-32 min-w-32 disabled:opacity-40">+</button>
            </span>
          )}
          <button type="button" onClick={onRemove} className="min-h-32 text-fg-muted underline underline-offset-3 hover:text-fg">Remove</button>
        </span>
      </span>
      <span className="tabular-nums">{formatPrice(item.unitPriceCents * item.quantity)}</span>
    </div>
  );
}
