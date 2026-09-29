import type { Order } from "@/lib/api";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** "Export CSV": one line per order, amounts in dollars, dates in ISO (for the accountant's sheet). */
export function ordersCsv(orders: Order[]): string {
  const head = ["Order", "Date", "Customer", "Email", "Items", "Total", "VAT included", "Status"];
  const lines = orders.map((o) => [`#${o.number}`, o.createdAt.slice(0, 10), o.customer.fullName, o.customer.email, o.summary, (o.totalCents / 100).toFixed(2), (o.taxCents / 100).toFixed(2), o.displayStatus]);
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
