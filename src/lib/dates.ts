/**
 * Dates as the boards write them, in English. UTC in the mock so the demo reads the same
 * everywhere (the mock timestamps are written as the boards show them).
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const d = (iso: string | Date) => (typeof iso === "string" ? new Date(iso) : iso);

/** "Oct 1" */
export const shortDate = (iso: string | Date) => `${MONTHS[d(iso).getUTCMonth()]} ${d(iso).getUTCDate()}`;

const ADMIN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sep 29" (admin boards write three-letter months). */
export const adminDate = (iso: string | Date) => `${ADMIN_MONTHS[d(iso).getUTCMonth()]} ${d(iso).getUTCDate()}`;

/** "Oct 1, 2026" (Orders board). */
export const longDate = (iso: string | Date) => `${shortDate(iso)}, ${d(iso).getUTCFullYear()}`;

/** "12 Sept" (Account board: "Finished · signed 12 Sept"). */
export const dayMonth = (iso: string | Date) => `${d(iso).getUTCDate()} ${MONTHS[d(iso).getUTCMonth()]}`;

/** "Oct 1, 14:02" (Tracking board). */
export const dateTime = (iso: string | Date) => `${shortDate(iso)}, ${String(d(iso).getUTCHours()).padStart(2, "0")}:${String(d(iso).getUTCMinutes()).padStart(2, "0")}`;

/** "Friday, Oct 9" (Tracking board: estimated delivery). */
export const weekdayDate = (iso: string | Date) => `${DAYS[d(iso).getUTCDay()]}, ${shortDate(iso)}`;

/** "Sep 30, 14:02" (AdminOrderDetail timeline, "paid Oct 1, 14:02"). */
export const adminDateTime = (iso: string | Date) => `${adminDate(iso)}, ${String(d(iso).getUTCHours()).padStart(2, "0")}:${String(d(iso).getUTCMinutes()).padStart(2, "0")}`;
