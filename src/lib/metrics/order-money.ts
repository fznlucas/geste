/**
 * The books' view of each order (Orders CSV). Apart from `./orders` so the order mapping, which reads
 * the tabs, does not import the ledger.
 */
import { allOrders, allRefunds } from "@/lib/api/local";
import type { Order, OrderDetail } from "@/lib/api/types";
import { parisDay } from "@/lib/clock";
import { fxRate, toEur } from "@/lib/ledger/fx";
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
  /** The order's total as sold, EUR excl. VAT, before refunds: what it sold (gift cards in it included, they carry no VAT). The "EUR excl. VAT" display of the order total. */
  totalExVatEurCents: number;
  /** The same, net of its refunds: the "EUR excl. VAT" display of what a customer spent. */
  spentExVatEurCents: number;
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
          totalExVatEurCents: sum((l) => l.sourceTable === "orders" && (l.account.startsWith("revenue.") || l.account === "liability.giftcards")),
          spentExVatEurCents: sum((l) => (l.sourceTable === "orders" && (l.account.startsWith("revenue.") || l.account === "liability.giftcards")) || (l.sourceTable === "refunds" && l.account.startsWith("refunds."))),
        }];
      }),
    );
  },
);

/**
 * What each customer spent, EUR excl. VAT net of refunds (Customers in "EUR excl. VAT"), from their orders'
 * lines; `upTo`: only the orders placed until then (the order detail's "lifetime" at that order), as the USD figure.
 */
export const customerSpentEur = metric(
  "Per customer: the EUR excl. VAT of their paid orders net of refunds, from the ledger (gift cards they bought included).",
  function customerSpentEur(upTo?: string): Map<string, number> {
    const orderOf = new Map(allOrders().map((o) => [o.id, o]));
    const refundOrder = new Map(allRefunds().map((r) => [r.id, r.orderId]));
    const out = new Map<string, number>();
    for (const l of books().lines) {
      const counted = (l.sourceTable === "orders" && (l.account.startsWith("revenue.") || l.account === "liability.giftcards")) || (l.sourceTable === "refunds" && l.account.startsWith("refunds."));
      if (!counted) continue;
      const o = orderOf.get(l.sourceTable === "orders" ? l.sourceId : (refundOrder.get(l.sourceId) ?? ""));
      if (!o || (upTo && o.createdAt > upTo)) continue;
      out.set(o.userId, (out.get(o.userId) ?? 0) + l.amountEurCents);
    }
    return out;
  },
);

/** One order in "EUR excl. VAT" (order detail): each line, discount and shipping converted at the payment day's rate and taken out of VAT; totals from the books. */
export interface OrderEur {
  fxRate: number;
  lines: Map<string, number>;
  discountCents: number;
  shippingCents: number;
  totalExVatCents: number;
  vatCents: number;
  /** What was charged, in euros (VAT included). */
  totalCents: number;
  /** Refunded, EUR excl. VAT. */
  refundedExVatCents: number;
}

export const orderEur = metric(
  "One order in EUR excl. VAT: lines, discount, shipping at the payment day's rate without VAT (gift cards carry none); totals and refunds from the books.",
  function orderEur(o: Pick<OrderDetail, "id" | "items" | "discountCents" | "shippingCents" | "totalCents" | "vatRatePct" | "paidAt" | "refunds">): OrderEur {
    const rate = fxRate(parisDay(o.paidAt));
    const vat = o.vatRatePct / 100;
    const ex = (usd: number, taxed = true) => Math.round(toEur(usd, rate) / (1 + (taxed ? vat : 0)));
    const m = orderMoney([o]).get(o.id)!;
    const totalCents = toEur(o.totalCents, rate);
    return {
      fxRate: rate,
      lines: new Map(o.items.map((i) => [i.id, ex(i.unitPriceCents * i.quantity, i.kind !== "gift_card")])),
      discountCents: ex(o.discountCents),
      shippingCents: ex(o.shippingCents),
      totalExVatCents: m.totalExVatEurCents,
      vatCents: totalCents - m.totalExVatEurCents,
      totalCents,
      refundedExVatCents: m.totalExVatEurCents - m.spentExVatEurCents,
    };
  },
);
