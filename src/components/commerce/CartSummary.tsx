import { formatPrice } from "@/lib/format";

export interface CartTotals {
  subtotalCents: number;
  discountCents?: number;
  discountLabel?: string;
  /** null = not computed yet (no address) → shows "Calculated at next step". 0 = "Free" (guides only). */
  shippingCents: number | null;
  taxIncludedCents?: number;
  totalCents: number;
}

/** Right-aligned totals block. Hidden entirely on the Confirmation step (validated change). */
export function CartSummary({ totals, hasPhysical }: { totals: CartTotals; hasPhysical: boolean }) {
  const rows: Array<[string, string, boolean?]> = [["Subtotal", formatPrice(totals.subtotalCents)]];
  if (totals.discountCents) rows.push([totals.discountLabel ?? "Discount", `−${formatPrice(totals.discountCents)}`]);
  rows.push([
    "Shipping",
    !hasPhysical ? "Digital, no shipping" : totals.shippingCents === null ? "Calculated at next step" : totals.shippingCents === 0 ? "Free" : formatPrice(totals.shippingCents),
  ]);
  if (totals.taxIncludedCents) rows.push(["VAT included", formatPrice(totals.taxIncludedCents)]);
  rows.push(["Total", formatPrice(totals.totalCents), true]);
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-y-6">
      {rows.map(([k, v, strong]) => (
        <div key={k} className="contents">
          <dt className={strong ? "font-medium" : "text-fg-muted"}>{k}</dt>
          <dd className={strong ? "text-right font-medium tabular-nums" : "text-right tabular-nums"}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
