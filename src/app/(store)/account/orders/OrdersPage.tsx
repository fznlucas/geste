"use client";

/**
 * /account/orders (boards Orders, MOrders): the customer's orders, newest open. Mock: `getOrders`
 * merges the orders paid at checkout in this browser; invoices wait for launch (tooltip).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountOrderRow, Button, ButtonLink, Tooltip } from "@/components";
import { customerOrderStatus, getOrders, orderLineTitle, type Order } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { deliveryName } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { AccountFrame } from "../_parts/AccountFrame";

export function OrdersPage() {
  return (
    <AccountFrame current="orders" phoneGap="gap-14">
      {({ phone, session }) => <Orders phone={phone} customerId={session.userId} />}
    </AccountFrame>
  );
}

function Orders({ phone, customerId }: { phone: boolean; customerId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  // null = the newest order, open as on the boards; "" = all closed.
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getOrders({ customerId }).then((o) => live && setOrders(o));
    return () => {
      live = false;
    };
  }, [customerId]);

  if (orders === null) {
    return (
      <div aria-busy="true" className="flex flex-col gap-8 lg:col-span-9 lg:col-start-4">
        <span className="sr-only">Loading your orders</span>
        <div className="h-56 bg-surface-muted" />
        <div className="h-56 bg-surface-muted" />
      </div>
    );
  }

  const openNumber = open ?? orders[0]?.number ?? "";
  const rows = orders.map((o) => {
    const hasPrint = o.items.some((i) => i.kind === "print");
    const hasGuide = o.items.some((i) => i.kind === "guide");
    const lines = o.items.map((i) => ({ label: orderLineTitle(i), price: formatPrice(i.unitPriceCents * i.quantity) }));
    if (o.shippingMethod) lines.push({ label: deliveryName(o.shippingMethod), price: formatPrice(o.shippingCents) });
    const invoice = (
      <Tooltip content="Available after launch">
        <Button variant="ghost" aria-disabled="true" className="cursor-not-allowed text-fg-muted hover:bg-transparent">
          {phone ? "Invoice" : "Download invoice"}
        </Button>
      </Tooltip>
    );
    const actions = phone ? (
      <>
        {hasPrint && <ButtonLink href={`/track?order=${o.number}`} variant="ghost">Track</ButtonLink>}
        {invoice}
      </>
    ) : (
      <>
        {hasPrint && <ButtonLink href={`/track?order=${o.number}`} variant="ghost">Track the print</ButtonLink>}
        {hasGuide && <ButtonLink href="/account" variant="ghost">Open in library</ButtonLink>}
        {invoice}
      </>
    );
    return (
      <AccountOrderRow
        key={o.id}
        variant={phone ? "phone" : "desktop"}
        number={`#${o.number}`}
        date={longDate(o.paidAt)}
        status={phone ? customerOrderStatus(o).split(" · ")[0]! : customerOrderStatus(o)}
        total={formatPrice(o.totalCents)}
        lines={lines}
        open={openNumber === o.number}
        onToggle={() => setOpen(openNumber === o.number ? "" : o.number)}
        actions={actions}
      />
    );
  });

  const empty = (
    <p>
      No orders yet. <Link href="/shop" className="underline underline-offset-3 hover:text-fg-muted">Browse the shop</Link>.
    </p>
  );

  if (phone) return orders.length ? <>{rows}</> : empty;

  return (
    <div className="col-span-9 col-start-4 flex flex-col">
      <div className="mb-20 flex justify-between">
        <h2 className="text-xs font-medium tracking-normal">Orders</h2>
        <span className="text-fg-muted">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>
      </div>
      {orders.length ? rows : empty}
    </div>
  );
}
