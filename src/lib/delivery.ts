import { shortDate } from "@/lib/dates";
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
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) left--;
  }
  return d;
}

/** First and last day the parcel can arrive, from the payment date. */
export function deliveryRange(m: ShippingMethod | null, paidAt: string): { start: Date; end: Date } {
  const d = DELIVERY.find((x) => x.method === m) ?? DELIVERY[0]!;
  return { start: addWorkingDays(new Date(paidAt), d.days[0]), end: addWorkingDays(new Date(paidAt), d.days[1]) };
}

/** Carrier of a shipping method: name on the Tracking board and its public tracking page. */
export const CARRIERS = {
  colissimo: { name: "Colissimo", url: "https://www.laposte.fr/outils/suivre-vos-envois" },
  mondial_relay: { name: "Mondial Relay", url: "https://www.mondialrelay.fr/suivi-de-colis/" },
  chronopost: { name: "Chronopost", url: "https://www.chronopost.fr/fr/suivi-colis" },
} as const;

export type CarrierKey = keyof typeof CARRIERS;

export const carrierOf = (m: ShippingMethod | null): CarrierKey => (m === "mondial_relay" ? "mondial_relay" : m === "chronopost_express" ? "chronopost" : "colissimo");

/** "6A20331234567" → "6A 203 312 345 67" (Colissimo numbers as the Tracking board writes them); others unchanged. */
export const formatTrackingNo = (n: string) => (/^[0-9A-Z]{2}\d{11}$/.test(n) ? `${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5, 8)} ${n.slice(8, 11)} ${n.slice(11)}` : n);

/** "Oct 3–5", "Sept 30–Oct 2", "Oct 1" from the payment date (UTC, like every mock date). */
export function deliveryWindow(m: ShippingMethod | null, paidAt: string): string {
  const { start, end } = deliveryRange(m, paidAt);
  const month = (x: Date) => shortDate(x).split(" ")[0];
  if (start.getTime() === end.getTime()) return shortDate(start);
  return month(start) === month(end) ? `${shortDate(start)}–${end.getUTCDate()}` : `${shortDate(start)}–${shortDate(end)}`;
}
