/**
 * Dates as the boards write them, in English. The store and the reader read UTC in the mock so the demo
 * reads the same everywhere; the admin reads Paris time (`adminDate`, `parisDate`: docs/decisions.md).
 */
import { simNow } from "./clock";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const d = (iso: string | Date) => (typeof iso === "string" ? new Date(iso) : iso);

/** "Oct 1" */
export const shortDate = (iso: string | Date) => `${MONTHS[d(iso).getUTCMonth()]} ${d(iso).getUTCDate()}`;

const ADMIN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 29" in Paris time (admin boards write three-letter months); the year when it is not this year. */
export const adminDate = (iso: string | Date) => parisDate(iso, String(simNow().getUTCFullYear()));

/** "Oct 1, 2026" (Orders board). */
export const longDate = (iso: string | Date) => `${shortDate(iso)}, ${d(iso).getUTCFullYear()}`;

/** "12 Sept" (Account board: "Finished · signed 12 Sept"). */
export const dayMonth = (iso: string | Date) => `${d(iso).getUTCDate()} ${MONTHS[d(iso).getUTCMonth()]}`;

/** "Oct 1, 14:02" (Tracking board). */
export const dateTime = (iso: string | Date) => `${shortDate(iso)}, ${String(d(iso).getUTCHours()).padStart(2, "0")}:${String(d(iso).getUTCMinutes()).padStart(2, "0")}`;

/** "Friday, Oct 9" (Tracking board: estimated delivery). */
export const weekdayDate = (iso: string | Date) => `${DAYS[d(iso).getUTCDay()]}, ${shortDate(iso)}`;

/** "Sep 30, 14:02" in Paris time (AdminOrderDetail timeline, "paid Oct 1, 14:02"). */
export const adminDateTime = (iso: string | Date) => parisDateTime(iso, String(simNow().getUTCFullYear()));

// ── Admin: Paris time, one format everywhere (docs/admin-v2/06 §1) ────────────

const parisParts = (iso: string | Date) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d(iso));
  const v = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { y: v("year"), m: v("month"), day: v("day"), hh: v("hour"), mm: v("minute") };
};

/**
 * "Oct 6" in Paris; the year is added when it is not `currentYear` ("Dec 24, 2027"). Pass the simulated
 * year (`simToday().slice(0, 4)`) so a pinned clock reads the same.
 */
export function parisDate(iso: string | Date, currentYear?: string): string {
  const p = parisParts(iso);
  return `${ADMIN_MONTHS[p.m - 1]} ${p.day}${currentYear && String(p.y) !== currentYear ? `, ${p.y}` : ""}`;
}

/** "Oct 6, 14:02" in Paris (the year as in `parisDate`). */
export function parisDateTime(iso: string | Date, currentYear?: string): string {
  const p = parisParts(iso);
  return `${parisDate(iso, currentYear)}, ${String(p.hh).padStart(2, "0")}:${String(p.mm).padStart(2, "0")}`;
}

/** "Sep 6 – Oct 5" (a period of Paris days, "YYYY-MM-DD"). */
export function parisSpan(from: string, to: string, currentYear?: string): string {
  return from === to ? parisDate(`${from}T12:00:00Z`, currentYear) : `${parisDate(`${from}T12:00:00Z`, currentYear)} – ${parisDate(`${to}T12:00:00Z`, currentYear)}`;
}
