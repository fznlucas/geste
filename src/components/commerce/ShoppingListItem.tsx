import { Icon } from "../brand/Icon";

export interface ShoppingItem {
  name: string; // "Turquoise"
  quantity: string; // "60 ml" (scaled to the format)
  standard: { label: string; priceUsd: number; url: string };
  budget: { label: string; priceUsd: number; url: string };
}

/**
 * One material with a standard and a budget option. Links open the partner store in a new tab
 * with the affiliate ref, and fire `affiliate_click`. Disclosure sentence sits once above the list.
 */
export function ShoppingListItem({ item, choice, onTrack }: { item: ShoppingItem; choice: "standard" | "budget"; onTrack?: (url: string) => void }) {
  const o = item[choice];
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-16 border-b border-border py-12">
      <span className="flex flex-col">
        <span>
          {item.name} <span className="text-fg-muted">· {item.quantity}</span>
        </span>
        <span className="text-fg-muted">{o.label}</span>
      </span>
      <span className="tabular-nums">~${o.priceUsd}</span>
      <a href={o.url} target="_blank" rel="noopener sponsored" onClick={() => onTrack?.(o.url)} className="inline-flex min-h-44 items-center gap-6 underline underline-offset-3 hover:text-fg-muted">
        Buy <Icon name="external" />
        <span className="sr-only">(opens partner store)</span>
      </a>
    </div>
  );
}
