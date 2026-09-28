"use client";

import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ShoppingListLine } from "@/lib/api/types";

export interface ShoppingListTableProps {
  lines: ShoppingListLine[];
  tier: "standard" | "budget";
  /** Positions ticked "I already have". */
  have: ReadonlySet<number>;
  onToggle: (position: number) => void;
}

/**
 * Materials of a guide (boards ShoppingList, MShoppingList). Desktop: table "Item · What to look for ·
 * Price · Where", rows of 48 px plus their 1 px rule (49). Phone: checkbox, name over what to look for, price over "Find it".
 * A ticked row turns Stone and its name is struck through. "Find it" opens the partner shop in a new tab.
 */
export function ShoppingListTable({ lines, tier, have, onToggle }: ShoppingListTableProps) {
  return (
    <div role="table" aria-label="Materials" className="flex flex-col border-t border-border lg:border-t-0">
      <div role="row" className="hidden grid-cols-[32px_1.2fr_1.6fr_70px_110px] gap-x-12 border-b border-border py-10 text-fg-muted lg:grid">
        <span role="columnheader"><span className="sr-only">Already have</span></span>
        <span role="columnheader">Item</span>
        <span role="columnheader">What to look for</span>
        <span role="columnheader" className="text-right">Price</span>
        <span role="columnheader" className="text-right">Where</span>
      </div>
      {lines.map((l) => {
        const on = have.has(l.position);
        const option = l[tier];
        return (
          <div
            key={l.position}
            role="row"
            className={cn(
              "grid grid-cols-[28px_1fr_auto] items-center gap-x-8 border-b border-border py-10 lg:min-h-49 lg:grid-cols-[32px_1.2fr_1.6fr_70px_110px] lg:gap-x-12 lg:py-0",
              on ? "text-fg-muted" : "text-fg",
            )}
          >
            <span role="cell" className="flex">
              <input type="checkbox" checked={on} onChange={() => onToggle(l.position)} aria-label={`I already have: ${l.name}`} className="size-16 accent-fg lg:size-14" />
            </span>
            <span role="cell" className="flex flex-col lg:contents">
              <span className={on ? "line-through" : undefined}>{l.name}</span>
              <span className="text-fg-muted lg:hidden">{option.label}</span>
            </span>
            <span role="cell" className="hidden text-fg-muted lg:block">{option.label}</span>
            <span role="cell" className="flex flex-col items-end lg:contents">
              <span className="lg:text-right">{formatPrice(option.priceCents)}</span>
              <a href={option.url} target="_blank" rel="noopener sponsored" className="underline underline-offset-3 hover:text-fg-muted lg:text-right">
                Find it<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </span>
          </div>
        );
      })}
    </div>
  );
}
