"use client";

/** /kit: order statuses (AdminOrders, AdminOrderDetail) and the refund dialog in its states (M6 "orders"). */
import { useState } from "react";
import { Button, OrderStatusChip, RefundModal, fulfilmentLabel } from "@/components";

const OPTIONS = [
  { key: "print", label: "Print only (returned)", amountCents: 5100 },
  { key: "guide", label: "Guide only (revokes library access)", amountCents: 1900 },
  { key: "full", label: "Full order", amountCents: 7000 },
];
const REASONS = ["Print damaged in transit", "Changed their mind (14 days)", "Duplicate order", "Other"];
const STATUSES = ["To ship", "Print to ship", "Refund asked", "Printed", "Packed", "Pending", "Shipped", "Delivered", "Partly refunded", "Refunded", "Cancelled"];

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <span className="text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

export function OrdersKit() {
  const [open, setOpen] = useState<null | "owner" | "support" | "error">(null);
  return (
    <div className="flex flex-col gap-24">
      <State label="OrderStatusChip · order status (Signal = needs a hand, filled = finished, hollow = in between)">
        <div className="flex flex-wrap gap-x-24 gap-y-8">
          {STATUSES.map((s) => (
            <OrderStatusChip key={s} status={s} />
          ))}
        </div>
      </State>
      <State label="Line fulfilment (AdminOrderDetail)">
        <div className="flex flex-wrap gap-x-24 gap-y-8">
          {(["to_print", "printed", "packed", "shipped", "delivered", "returned"] as const).map((f) => (
            <OrderStatusChip key={f} status={fulfilmentLabel("print", f)} />
          ))}
          <OrderStatusChip status={fulfilmentLabel("guide", "not_required")} />
          <OrderStatusChip status={fulfilmentLabel("guide", "not_required", true)} />
          <OrderStatusChip status={fulfilmentLabel("gift_card", "not_required")} />
        </div>
      </State>
      <State label="RefundModal · owner / Support above $50 / failed">
        <div className="flex gap-10">
          <Button variant="danger" onClick={() => setOpen("owner")}>Refund…</Button>
          <Button variant="ghost" onClick={() => setOpen("support")}>As Support ($50 max)</Button>
          <Button variant="ghost" onClick={() => setOpen("error")}>Refund that fails</Button>
        </div>
      </State>
      <RefundModal
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        orderNumber="GS-2041"
        options={open === "support" ? [...OPTIONS].reverse() : OPTIONS}
        reasons={REASONS}
        restockLabel="Put edition 12/50 back in stock"
        limitCents={open === "support" ? 5000 : Number.POSITIVE_INFINITY}
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 600));
          if (open === "error") throw new Error("Stripe refused the refund. Try again in a minute.");
        }}
      />
    </div>
  );
}
