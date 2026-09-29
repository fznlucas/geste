import { SHIPPING, type ShippingMethod } from "@/lib/pricing";

/** Carriers offered at checkout, in the Checkout board's order (Colissimo home is the default). */
export const DELIVERY: Array<{ method: ShippingMethod; name: string; eta: string; phoneName: string; phoneEta: string; days: [number, number] }> = [
  { method: "colissimo", name: "Colissimo, home", eta: "3–5 working days", phoneName: "Colissimo, home", phoneEta: "3–5 days", days: [3, 5] },
  { method: "mondial_relay", name: "Mondial Relay, pickup point", eta: "4–6 working days", phoneName: "Mondial Relay, pickup", phoneEta: "4–6 days", days: [4, 6] },
  { method: "chronopost_express", name: "Chronopost express", eta: "Next working day", phoneName: "Chronopost express", phoneEta: "Next day", days: [1, 1] },
];

export const deliveryName = (m: ShippingMethod | null, phone = false) => {
  const d = DELIVERY.find((x) => x.method === m);
  return d ? (phone ? d.phoneName : d.name) : m ? SHIPPING[m].label : "";
};

/** Shipping countries (Checkout board) with their ISO code for VAT. "Other" has no VAT line. */
export const COUNTRIES: Array<[label: string, code: string]> = [
  ["France", "FR"],
  ["Belgium", "BE"],
  ["Switzerland", "CH"],
  ["Germany", "DE"],
  ["Other", "XX"],
];

function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) left--;
  }
  return d;
}

/** "Oct 3–5", "Sep 30–Oct 2", "Oct 1" from the payment date. */
export function deliveryWindow(m: ShippingMethod | null, paidAt: string): string {
  const d = DELIVERY.find((x) => x.method === m) ?? DELIVERY[0]!;
  const start = addWorkingDays(new Date(paidAt), d.days[0]);
  const end = addWorkingDays(new Date(paidAt), d.days[1]);
  const month = (x: Date) => x.toLocaleString("en-US", { month: "short" });
  if (d.days[0] === d.days[1]) return `${month(start)} ${start.getDate()}`;
  return month(start) === month(end) ? `${month(start)} ${start.getDate()}–${end.getDate()}` : `${month(start)} ${start.getDate()}–${month(end)} ${end.getDate()}`;
}
