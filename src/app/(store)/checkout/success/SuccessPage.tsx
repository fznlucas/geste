"use client";

/**
 * /checkout/success?order=GS-2042: step 04 of the Checkout / MCheckout boards. The summary column is
 * gone and no step is clickable. Mock: the order comes from this browser's purchases
 * (`@/lib/client` purchases → `getOrder` merges them).
 */
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink, CheckoutStepper, Tooltip, type CheckoutStep } from "@/components";
import { copyNumbersLabel as numbersLabel, getOrder, orderLineTitle as receiptTitle, type OrderDetail, type OrderItem } from "@/lib/api";
import { useHydrated, usePurchases } from "@/lib/client";
import { formatPrice } from "@/lib/format";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { deliveryName, deliveryWindow } from "@/lib/delivery";

type Load = { status: "loading" } | { status: "missing" } | { status: "ready"; order: OrderDetail };

const listWorks = (numbers: string[]) => (numbers.length < 2 ? numbers.join("") : `${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`);

export function SuccessPage() {
  const hydrated = useHydrated();
  const desktop = useMediaQuery("(min-width: 1200px)");
  const number = useSearchParams().get("order") ?? "";
  const purchases = usePurchases();
  const receipt = purchases.receipts.find((r) => r.number === number);
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    // Only orders placed in this browser: the mock tables' orders are not "just paid".
    const local = purchases.orders.some((o) => o.number === number);
    const found = local ? getOrder(number) : Promise.resolve(null);
    void found.then((order) => live && setLoad(order ? { status: "ready", order } : { status: "missing" }));
    return () => {
      live = false;
    };
  }, [hydrated, number, purchases.orders]);

  const frame = (children: React.ReactNode, hasPrint = true) => {
    const steps: CheckoutStep[] = hasPrint ? ["contact", "shipping", "payment", "confirmation"] : ["contact", "payment", "confirmation"];
    const stepper = <CheckoutStepper variant={desktop ? "desktop" : "phone"} steps={steps} current="confirmation" clickable={[]} onGo={() => {}} />;
    if (!desktop) {
      return (
        <div className="mx-auto flex w-full max-w-560 flex-col gap-20 px-16 pb-40 pt-8">
          {stepper}
          {children}
        </div>
      );
    }
    return (
      <div className="mx-auto grid w-full max-w-1440 grid-cols-12 content-start gap-x-40 px-120 pt-40">
        <div className="col-span-7 flex flex-col gap-32">
          <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted">
            <Link href="/cart" className="hover:text-fg">Cart</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-fg">Checkout</span>
          </nav>
          {stepper}
          {children}
        </div>
      </div>
    );
  };

  if (!hydrated || load.status === "loading") {
    return frame(
      <div aria-busy="true" className="flex flex-col gap-24">
        <span className="sr-only">Loading your order</span>
        <div className="h-80 bg-surface-muted" />
        <div className="h-160 bg-surface-muted" />
      </div>,
    );
  }

  if (load.status === "missing") {
    return frame(
      <section className="flex flex-col items-start gap-12">
        <h1 className="text-xs font-medium tracking-normal">We can’t find this order.</h1>
        <p className="text-fg-muted">Orders you paid for are in your account, with their receipts.</p>
        <ButtonLink href="/shop" trailing="→">Browse works</ButtonLink>
      </section>,
    );
  }

  const { order } = load;
  const guides = order.items.filter((i) => i.kind === "guide");
  const prints = order.items.filter((i) => i.kind === "print");
  const gifts = order.items.filter((i) => i.kind === "gift_card");
  const email = receipt?.email ?? order.customer.email;
  const firstName = receipt?.firstName || order.customer.fullName.split(" ")[0] || "friend";
  const guideTitle = `${listWorks(guides.map((g) => g.workNumber ?? ""))} ${guides.length > 1 ? "are" : "is"} in your library`;
  const shipName = deliveryName(order.shippingMethod, !desktop);
  const eta = deliveryWindow(order.shippingMethod, order.paidAt);

  if (!desktop) {
    return frame(
      <section className="flex flex-col gap-16">
        <span className="text-fg-muted">Order #{order.number} · confirmed</span>
        <h1 className="text-lg font-medium">Thank you, {firstName}.</h1>
        <span>A receipt is on its way to {email}.</span>
        {guides.length > 0 && (
          <div className="flex gap-14 bg-surface-muted p-14">
            <Thumb src={guides[0]!.imageUrl} w={72} h={90} />
            <div className="flex flex-col gap-8">
              <span className="font-medium">{guideTitle}</span>
              <Link href="/account" className="self-start underline underline-offset-3 hover:text-fg-muted">Open my library</Link>
            </div>
          </div>
        )}
        {prints.map((p) => (
          <div key={p.id} className="flex gap-14 border border-border p-14">
            <Thumb src={p.imageUrl} w={72} h={90} />
            <div className="flex flex-col gap-4">
              <span className="font-medium">Print {p.workNumber}, {numbersLabel(p)}</span>
              <span className="text-fg-muted">{shipName}</span>
              <Link href={`/track?order=${order.number}`} className="self-start underline underline-offset-3 hover:text-fg-muted">Track it</Link>
            </div>
          </div>
        ))}
        {gifts.map((g) => <GiftCardRow key={g.id} item={g} phone />)}
        <Link href="/account/settings#passkeys" className="flex justify-between border border-border p-14 hover:bg-surface-muted">
          <span>Save a passkey for next time</span>
          <span className="underline underline-offset-3">Set up</span>
        </Link>
      </section>,
      prints.length > 0,
    );
  }

  return frame(
    <section className="flex flex-col gap-24">
      <div className="flex flex-col gap-6">
        <span className="text-fg-muted">Order #{order.number} · confirmed</span>
        <h1 className="text-lg font-medium">Thank you, {firstName}.</h1>
        <span>A receipt is on its way to {email}.</span>
      </div>
      {guides.length > 0 && (
        <div className="flex gap-20 bg-surface-muted p-20">
          <Thumb src={guides[0]!.imageUrl} w={96} h={120} />
          <div className="flex flex-1 flex-col gap-6">
            <span className="font-medium">{guideTitle}</span>
            <span className="text-fg-muted">Open it once online and it works offline on your phone. Your shopping list is inside.</span>
            <ButtonLink href="/account" trailing="→" className="mt-auto">Open my library</ButtonLink>
          </div>
        </div>
      )}
      {prints.map((p) => (
        <div key={p.id} className="flex gap-20 border border-border p-20">
          <Thumb src={p.imageUrl} w={96} h={120} />
          <div className="flex flex-1 flex-col gap-6">
            <span className="font-medium">Your print {p.workNumber}, {numbersLabel(p)}</span>
            <span className="text-fg-muted">{shipName}. Estimated delivery {eta}. We will email your tracking number.</span>
          </div>
        </div>
      ))}
      {gifts.map((g) => <GiftCardRow key={g.id} item={g} />)}
      <div className="flex flex-col gap-6 border-t border-border pt-16">
        <span className="text-fg-muted">Receipt</span>
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between">
            <span>{receiptTitle(i)}</span>
            <span className="tabular-nums">{formatPrice(i.unitPriceCents * i.quantity)}</span>
          </div>
        ))}
        {order.shippingMethod && (
          <div className="flex justify-between">
            <span>{shipName}</span>
            <span className="tabular-nums">{formatPrice(order.shippingCents)}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span>Paid</span>
          <span className="tabular-nums">{formatPrice(order.totalCents)}</span>
        </div>
        <Tooltip content="Available after launch">
          {/* A 20 px line as drawn; 2 px padding cancelled by -2 px margins makes a 24 px target (WCAG 2.2). */}
          <button type="button" aria-disabled="true" className="-my-2 cursor-not-allowed self-start py-2 text-fg-muted underline underline-offset-3">
            Download invoice (PDF)
          </button>
        </Tooltip>
      </div>
      <div className="flex items-center justify-between border border-border px-20 py-16">
        <span>Log in faster next time: save a passkey (Face ID, Touch ID).</span>
        <Link href="/account/settings#passkeys" className="underline underline-offset-3 hover:text-fg-muted">Set it up</Link>
      </div>
      {guides.length > 0 && (
        <div className="flex flex-col gap-4">
          <span className="font-medium">What next</span>
          <span className="text-fg-muted">Buy your materials from the list, clear an afternoon, and start with layer 01. Share the result with @geste.studio.</span>
        </div>
      )}
    </section>,
    prints.length > 0,
  );
}

function Thumb({ src, w, h }: { src: string | null; w: number; h: number }) {
  return (
    <span className="relative block shrink-0 bg-surface-sunk" style={{ width: w, height: h }}>
      {src && <Image src={src} alt="" fill sizes={`${w}px`} className="object-cover" />}
    </span>
  );
}

/** No board draws a gift card on the confirmation: a bordered row like the print's, without a picture. */
function GiftCardRow({ item, phone }: { item: OrderItem; phone?: boolean }) {
  return (
    <div className={phone ? "flex flex-col gap-4 border border-border p-14" : "flex flex-col gap-6 border border-border p-20"}>
      <span className="font-medium">{item.title}</span>
      <span className="text-fg-muted">We email it to the person you chose, on the date you set. You get a copy.</span>
    </div>
  );
}
