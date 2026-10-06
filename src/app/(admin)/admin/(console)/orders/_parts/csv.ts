import type { Order } from "@/lib/api";
import { orderMoney } from "@/lib/metrics";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const money = (cents: number) => (cents / 100).toFixed(2);

/**
 * "Export CSV": the orders shown (tab, type, search), one line each, dates in ISO. Store amounts in
 * dollars as charged; the books' columns in EUR (02 §1: excl. VAT net of refunds, VAT, fees, rate).
 */
export function ordersCsv(orders: Order[]): string {
  const head = ["Order", "Date", "Customer", "Email", "Items", "Discount", "Shipping", "Total", "VAT included", "Refunded", "Status", "EUR excl. VAT (net of refunds)", "VAT EUR", "Fees EUR", "FX rate"];
  const books = orderMoney(orders);
  // Total is what was paid: net of the guide + print discount, shipping included.
  const lines = orders.map((o) => {
    const m = books.get(o.id);
    return [
      `#${o.number}`, o.createdAt.slice(0, 10), o.customer.fullName, o.customer.email, o.summary,
      money(o.discountCents), money(o.shippingCents), money(o.totalCents), money(o.taxCents), money(m?.refundedUsdCents ?? 0), o.displayStatus,
      m ? money(m.netExVatEurCents) : "", m ? money(m.vatEurCents) : "", m ? money(m.feesEurCents) : "", m?.fxRate?.toFixed(4) ?? "",
    ];
  });
  return [head, ...lines].map((l) => l.map(cell).join(",")).join("\n") + "\n";
}

/** Saves the text as a file in the browser (no server in the mock). */
export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
