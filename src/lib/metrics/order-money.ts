/**
 * The books' view of each order (Orders CSV). Apart from `./orders` so the order mapping, which reads
 * the tabs, does not import the ledger.
 */
import { allRefunds } from "@/lib/api/local";
import type { Order } from "@/lib/api/types";
import { books, STORE_ACCOUNTS, type LedgerLine } from "@/lib/ledger";
import { metric } from "./define";

/** What the books say about one order (Orders CSV, 02 §1): all in EUR cents except `refundedUsdCents`. */
export interface OrderMoney {
  /** Refunded so far, in the order's currency (USD cents). */
  refundedUsdCents: number;
  /** Turnover of the order net of its refunds, EUR excl. VAT (gift-card share included). */
  netExVatEurCents: number;
  /** VAT collected net of refunds, EUR. */
  vatEurCents: number;
  /** Payment and conversion fees, EUR (positive). */
  feesEurCents: number;
  /** USD → EUR rate of the payment day. */
  fxRate: number | null;
}

/** Ledger lines of each order and of its refunds, by order id. */
function linesByOrder(): Map<string, LedgerLine[]> {
  const refundOrder = new Map(allRefunds().map((r) => [r.id, r.orderId]));
  const out = new Map<string, LedgerLine[]>();
  for (const l of books().lines) {
    const orderId = l.sourceTable === "orders" ? l.sourceId : l.sourceTable === "refunds" ? refundOrder.get(l.sourceId) : undefined;
    if (!orderId) continue;
    const list = out.get(orderId);
    if (list) list.push(l);
    else out.set(orderId, [l]);
  }
  return out;
}

export const orderMoney = metric(
  "Per order, from the ledger: turnover net of refunds in EUR excl. VAT, VAT, payment fees, FX rate; refunded amount from the refund rows.",
  function orderMoney(orders: Array<Pick<Order, "id" | "refunds">>): Map<string, OrderMoney> {
    const byOrder = linesByOrder();
    return new Map(
      orders.map((o) => {
        const lines = byOrder.get(o.id) ?? [];
        const sum = (pred: (l: LedgerLine) => boolean) => lines.filter(pred).reduce((s, l) => s + l.amountEurCents, 0);
        return [o.id, {
          refundedUsdCents: o.refunds.reduce((s, r) => s + r.amountCents, 0),
          netExVatEurCents: sum((l) => STORE_ACCOUNTS.includes(l.account)),
          vatEurCents: sum((l) => l.account === "liability.vat"),
          feesEurCents: -sum((l) => l.account === "cost.payment_fees" || l.account === "cost.fx"),
          fxRate: lines.find((l) => l.sourceTable === "orders")?.fxRate ?? null,
        }];
      }),
    );
  },
);
