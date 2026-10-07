"use client";

import { useMemo } from "react";
import { priceCart, sameCartLine, type CartCodes, type PriceCartOptions } from "@/lib/api/cart";
import type { CartLineInput, PricedCart, StoredCartLine } from "@/lib/api/types";
import { LEVELS, isFormatKey } from "@/lib/pricing";
import { createPersistentStore, isRecord, newId, useStore } from "./store";

/**
 * Mock cart, kept in localStorage ("geste.cart.v2"). The functions have the names of the future
 * server actions in `src/actions/cart.ts` (signed cookie for guests, `carts` row when signed in):
 * swapping the backend changes their bodies, not their callers.
 * Only choices are stored; `useCart()` prices them with `priceCart` on every read.
 */

const PALETTE_KEYS = ["original", "warm", "cool", "earth"];
const MAX_LINES = 50;

function parseLine(raw: unknown): StoredCartLine | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.addedAt !== "string") return null;
  const { id, addedAt } = raw;
  switch (raw.kind) {
    case "guide":
      if (typeof raw.workId !== "string" || !isFormatKey(raw.format)) return null;
      if (typeof raw.level !== "string" || (raw.level !== "match" && !(raw.level in LEVELS))) return null;
      if (typeof raw.palette !== "string" || !PALETTE_KEYS.includes(raw.palette)) return null;
      return { id, addedAt, kind: "guide", workId: raw.workId, format: raw.format as never, level: raw.level as never, palette: raw.palette as never };
    case "print":
      if (typeof raw.editionId !== "string" || typeof raw.quantity !== "number" || !Number.isInteger(raw.quantity) || raw.quantity < 1) return null;
      return { id, addedAt, kind: "print", editionId: raw.editionId, quantity: raw.quantity };
    case "gift_card": {
      if (typeof raw.amountCents !== "number") return null;
      const str = (v: unknown) => (typeof v === "string" ? v : undefined);
      return { id, addedAt, kind: "gift_card", amountCents: raw.amountCents, recipientEmail: str(raw.recipientEmail), recipientName: str(raw.recipientName), message: str(raw.message), sendOn: str(raw.sendOn) };
    }
    default:
      return null;
  }
}

const EMPTY: StoredCartLine[] = [];

export const cartStore = createPersistentStore<StoredCartLine[]>("cart", 2, EMPTY, (raw) =>
  Array.isArray(raw) ? raw.slice(0, MAX_LINES).map(parseLine).filter((l): l is StoredCartLine => l !== null) : null,
);

/**
 * Adds a guide, a print or a gift card. The same guide configuration is not added twice (a guide is
 * bought once); the same edition adds one copy. Returns the id of the line that now holds it.
 */
export function addToCart(input: CartLineInput): string {
  const existing = cartStore.get().find((l) => sameCartLine(l, input));
  if (existing) {
    if (existing.kind === "print" && input.kind === "print") updateCartLine(existing.id, existing.quantity + input.quantity);
    return existing.id;
  }
  const line = { ...input, id: newId("line"), addedAt: new Date().toISOString() } as StoredCartLine;
  cartStore.set((lines) => [...lines, line].slice(-MAX_LINES));
  return line.id;
}

/** Prints only; the priced cart caps the quantity at the copies left. 0 removes the line. */
export function updateCartLine(id: string, quantity: number) {
  if (quantity < 1) {
    removeCartLine(id);
    return;
  }
  cartStore.set((lines) => lines.map((l) => (l.id === id && l.kind === "print" ? { ...l, quantity: Math.floor(quantity) } : l)));
}

/** Returns the removed line so the cart can offer "Undo". */
export function removeCartLine(id: string): StoredCartLine | undefined {
  const line = cartStore.get().find((l) => l.id === id);
  cartStore.set((lines) => lines.filter((l) => l.id !== id));
  return line;
}

/** "Undo" in the empty cart: puts removed lines back (same ids, same order). */
export function restoreCartLines(removed: StoredCartLine[]) {
  cartStore.set((lines) => [...lines, ...removed.filter((r) => !lines.some((l) => l.id === r.id))].sort((a, b) => a.addedAt.localeCompare(b.addedAt)));
}

/** After a successful (mock) payment. */
export function clearCart() {
  cartStore.reset();
}

/**
 * The priced cart. Before hydration it is the empty cart: pair it with `useHydrated()` to avoid
 * showing "Your cart is empty" for a frame.
 */
export function useCart(opts: PriceCartOptions & CartCodes = {}): PricedCart & { stored: StoredCartLine[] } {
  const stored = useStore(cartStore);
  const { shippingMethod, country, promoCode, giftCardCode, email } = opts;
  return useMemo(
    () => ({ ...priceCart(stored, { shippingMethod, country, promoCode, giftCardCode, email }), stored }),
    [stored, shippingMethod, country, promoCode, giftCardCode, email],
  );
}
