"use client";

import { Button, ButtonLink } from "../primitives/Button";
import { CanvasDiagram } from "../reader/CanvasDiagram";
import { N03_STROKES } from "../reader/sampleN03";
import { CartLine } from "./CartLine";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { BUNDLE_DISCOUNT_PCT } from "@/lib/pricing";
import type { PricedCart, PricedCartLine } from "@/lib/api/types";

export interface CartPanelProps {
  /** From `useCart({ shippingMethod: "mondial_relay" })`: the cheapest carrier gives "from $4". */
  cart: PricedCart;
  /** drawer = board Cart (440 px drawer). page = board MCart (/cart, phone). */
  variant: "drawer" | "page";
  onRemove: (lineId: string) => void;
  /** Not used by the boards' cart (no stepper drawn); kept for the checkout summary. */
  onQuantity?: (lineId: string, quantity: number) => void;
  /** Shows "Undo" in the empty state after the last line was removed. */
  onUndo?: () => void;
  /** Called when a link inside is followed (the drawer closes). */
  onNavigate?: () => void;
}

const ISSUES: Record<NonNullable<PricedCartLine["unavailable"]>, string> = {
  sold_out: "Sold out, not counted",
  unknown: "No longer available, not counted",
  invalid: "Amount not valid, not counted",
};

/**
 * Cart content shared by the drawer and the /cart page: lines, cross-sell (drawer), Subtotal,
 * Shipping, Estimated total, "Checkout   $68". Empty: canvas diagram, "Your cart is empty.", Browse works.
 */
export function CartPanel({ cart, variant, onRemove, onUndo, onNavigate }: CartPanelProps) {
  const drawer = variant === "drawer";

  if (cart.lines.length === 0) {
    return (
      <div className={drawer ? "flex flex-1 flex-col items-center justify-center gap-14 text-center" : "flex flex-col items-center gap-14 py-80 text-center"}>
        <CanvasDiagram strokes={N03_STROKES} upTo={1} width={90} />
        <span>Your cart is empty.</span>
        {drawer && <span className="text-fg-muted">Start with a Beginner work, about an hour.</span>}
        <ButtonLink href="/shop" trailing="→" onClick={onNavigate} className={drawer ? "min-w-220" : "min-w-240"}>Browse works</ButtonLink>
        {onUndo && <Button variant="text" onClick={onUndo} className="underline">Undo</Button>}
      </div>
    );
  }

  const { totals, hasPhysical } = cart;
  const shipping = !hasPhysical ? "Free, digital" : `from ${formatPrice(totals.shippingCents ?? 0)}${drawer ? ", next step" : ""}`;

  return (
    <div className={drawer ? "flex flex-1 flex-col gap-24" : "flex flex-col gap-18"}>
      <div className="flex flex-col border-t border-border">
        {cart.lines.map((l) => (
          <CartLine
            key={l.id}
            item={l}
            href={l.href}
            note={l.note}
            bundleNote={l.bundleNote}
            issue={l.unavailable && ISSUES[l.unavailable]}
            size={drawer ? "md" : "lg"}
            // No quantity stepper: none is drawn on Cart / MCart (adding the same print again adds a copy).
            onRemove={() => onRemove(l.id)}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      {drawer && cart.crossSell && (
        <p className="bg-surface-muted px-16 py-14">
          Paint {cart.crossSell.workNumber} yourself instead? Guide from {formatPrice(cart.crossSell.fromPriceCents)}, −{BUNDLE_DISCOUNT_PCT}% on both.{" "}
          <Link href={cart.crossSell.href} onClick={onNavigate} className="underline underline-offset-3 hover:text-fg-muted">See it</Link>
        </p>
      )}

      <div className={drawer ? "mt-auto flex flex-col gap-10" : "contents"}>
        <dl className={drawer ? "contents" : "flex flex-col gap-8"}>
          <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd className="tabular-nums">{formatPrice(totals.subtotalCents)}</dd></div>
          {!!totals.discountCents && (
            <div className="flex justify-between"><dt className="text-fg-muted">{totals.discountLabel ?? "Discount"}</dt><dd className="tabular-nums">−{formatPrice(totals.discountCents)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-fg-muted">Shipping</dt><dd className="tabular-nums">{shipping}</dd></div>
          <div className={drawer ? "flex justify-between border-t border-border pt-10 font-medium" : "flex justify-between border-t border-border pt-8 font-medium"}>
            <dt>Estimated total</dt><dd className="tabular-nums">{formatPrice(totals.totalCents)}</dd>
          </div>
        </dl>
        {cart.count > 0 ? (
          <ButtonLink href="/checkout" trailing={formatPrice(totals.totalCents)} onClick={onNavigate} className={drawer ? "mt-8" : undefined}>Checkout</ButtonLink>
        ) : (
          <Button trailing={formatPrice(0)} disabled className={drawer ? "mt-8" : undefined}>Checkout</Button>
        )}
        <span className="text-fg-muted">{drawer ? "Guides unlock instantly in your library. Prints ship in 3–5 days." : "Guides unlock instantly. Prints ship in 3–5 days."}</span>
      </div>
    </div>
  );
}
