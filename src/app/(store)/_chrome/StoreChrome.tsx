"use client";

/**
 * Store frame (docs/screens/store.md §Layout): SiteHeader ≥ 1200 px, MobileHeader below, SiteFooter,
 * cart drawer and toasts. Shared by `(store)/layout.tsx` and the root `not-found.tsx`.
 * Mock phase: cart and session come from `@/lib/client`; a "Reset demo" line sits under the footer.
 */
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CartPanel, Drawer, MobileHeader, SiteFooter, SiteHeader, ToastProvider, useToast, type SiteHeaderProps } from "@/components";
import type { StoredCartLine } from "@/lib/api";
import { removeCartLine, resetMockState, restoreCartLines, updateCartLine, useCart, useSession } from "@/lib/client";

interface CartDrawerApi {
  openCart: () => void;
}

const CartDrawerContext = createContext<CartDrawerApi | null>(null);

/** Opens the cart drawer from a page (e.g. "View" in the phone "Added to cart" toast). */
export function useCartDrawer(): CartDrawerApi {
  const api = useContext(CartDrawerContext);
  if (!api) throw new Error("useCartDrawer must be used inside <StoreChrome>");
  return api;
}

/** Remove with "Undo" (boards Cart, MCart): removed lines are kept until the panel is left. */
export function useUndoableCart() {
  const [removed, setRemoved] = useState<StoredCartLine[]>([]);
  const remove = useCallback((id: string) => {
    const line = removeCartLine(id);
    if (line) setRemoved((r) => [...r, line]);
  }, []);
  const undo = useCallback(() => {
    restoreCartLines(removed);
    setRemoved([]);
  }, [removed]);
  const forget = useCallback(() => setRemoved([]), []);
  return { remove, undo: removed.length > 0 ? undo : undefined, forget, quantity: updateCartLine };
}

const SECTIONS: Array<[prefix: string, label: NonNullable<SiteHeaderProps["active"]>]> = [
  ["/shop", "Shop"],
  ["/works", "Shop"],
  ["/prints", "Prints"],
  ["/method", "Method"],
  ["/journal", "Journal"],
  ["/about", "About"],
];

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  // The cheapest carrier gives the drawer's "Shipping from $4, next step" and its estimated total.
  const cart = useCart({ shippingMethod: "mondial_relay" });
  const session = useSession();
  const { remove, undo, forget, quantity } = useUndoableCart();
  const signedIn = session.status === "signed_in";
  const checkout = pathname === "/checkout" || pathname.startsWith("/checkout/");
  const active = SECTIONS.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1];

  const setDrawer = useCallback(
    (o: boolean) => {
      setOpen(o);
      if (!o) forget();
    },
    [forget],
  );
  const api = useMemo(() => ({ openCart: () => setOpen(true) }), []);

  // Mock: French arrives with next-intl (docs/mock-plan.md M8); newsletter has no backend.
  const onLocaleChange = (l: "en" | "fr") => {
    if (l === "fr") toast.show("French is coming soon.");
  };
  const subscribe = () => new Promise<void>((resolve) => setTimeout(resolve, 400));

  return (
    <CartDrawerContext.Provider value={api}>
      <div className="flex min-h-dvh flex-col">
        <div className="hidden lg:block">
          <SiteHeader active={active} cartCount={cart.count} signedIn={signedIn} onCartClick={() => setOpen(true)} />
        </div>
        <div className="lg:hidden">
          <MobileHeader cartCount={cart.count} signedIn={signedIn} onCartClick={() => router.push("/cart")} locale="en" onLocaleChange={onLocaleChange} />
        </div>
        <main id="main" className="flex flex-1 flex-col">{children}</main>
        {/* MCheckout draws no footer: on phones the checkout ends with its own buttons. */}
        <div className={checkout ? "hidden lg:block" : undefined}>
          <SiteFooter locale="en" onLocaleChange={onLocaleChange} subscribe={subscribe} />
          <p className="px-16 pb-24 text-fg-muted lg:px-32">
            Demo site: nothing is sold, nothing is sent.{" "}
            <button
              type="button"
              onClick={() => {
                resetMockState();
                forget();
                toast.show("Demo reset.");
              }}
              className="min-h-44 text-fg underline underline-offset-3 hover:text-fg-muted"
            >
              Reset demo
            </button>
          </p>
        </div>
      </div>
      <Drawer open={open} onOpenChange={setDrawer} title={`Cart (${cart.count})`}>
        <CartPanel cart={cart} variant="drawer" onRemove={remove} onQuantity={quantity} onUndo={undo} onNavigate={() => setDrawer(false)} />
      </Drawer>
    </CartDrawerContext.Provider>
  );
}

export function StoreChrome({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <Frame>{children}</Frame>
    </ToastProvider>
  );
}
