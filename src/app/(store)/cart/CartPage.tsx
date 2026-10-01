"use client";

import Link from "next/link";
import { CartPanel } from "@/components";
import { useCart, useHydrated } from "@/lib/client";
import { useUndoableCart } from "../_chrome/StoreChrome";

/** Board MCart: the cart as a page (the phone header's cart goes here). */
export function CartPage() {
  const hydrated = useHydrated();
  const cart = useCart({ shippingMethod: "mondial_relay" });
  const { remove, undo, quantity } = useUndoableCart();
  return (
    <div className="mx-auto flex w-full max-w-560 flex-col gap-18 px-16 pt-16 md:pt-48">
      <div className="flex items-center justify-between">
        <h1 className="text-lg">Cart ({cart.count})</h1>
        <Link href="/shop" className="underline underline-offset-3 hover:text-fg-muted">Keep browsing</Link>
      </div>
      {/* Nothing until the stored cart is read: no "Your cart is empty." flash. */}
      {hydrated && <CartPanel cart={cart} variant="page" onRemove={remove} onQuantity={quantity} onUndo={undo} />}
    </div>
  );
}
