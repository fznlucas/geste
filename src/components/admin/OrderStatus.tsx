import type { StatusState } from "@/lib/types";
import { StatusChip } from "../primitives/StatusChip";

/**
 * Order status as the admin boards draw it: what needs a hand is Signal (To ship, Refund asked),
 * what is finished is a filled dot (Delivered, Shipped, Refunded), steps in between are hollow
 * (Printed, Packed, Pending), Cancelled is off.
 */
export function orderStatusState(status: string): StatusState {
  if (status === "To ship" || status === "Print to ship" || status === "Refund asked") return "issue";
  if (status === "Delivered" || status === "Shipped" || status === "Refunded" || status === "Sent") return "done";
  if (status === "Cancelled" || status === "Returned") return "off";
  return "todo";
}

/** Fulfilment of one order line (AdminOrderDetail "Fulfilment" column). */
export function fulfilmentLabel(kind: "guide" | "print" | "gift_card", fulfilment: string, accessRevoked = false): string {
  if (kind === "guide") return accessRevoked ? "Revoked" : "Delivered";
  if (kind === "gift_card") return "Sent";
  return { to_print: "To ship", printed: "Printed", packed: "Packed", shipped: "Shipped", delivered: "Delivered", returned: "Returned" }[fulfilment] ?? "To ship";
}

export function OrderStatusChip({ status, label, className }: { status: string; label?: string; className?: string }) {
  const state = status === "Revoked" ? "off" : orderStatusState(status);
  return <StatusChip state={state} label={label ?? status} className={className} />;
}
