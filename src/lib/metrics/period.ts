/**
 * Periods of the admin (docs/admin-v2/04, 06): Europe/Paris days, inclusive, ending today by the
 * simulated clock. Every figure names its period, and every delta names what it compares with.
 */
import { addDays, parisDay, simToday } from "@/lib/clock";

/** Paris days, both included: "2026-09-06" → "2026-10-05". */
export interface Period {
  from: string;
  to: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const dayNumber = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))) / 86_400_000;

/** Number of days in a period. */
export function periodDays(p: Period): number {
  return dayNumber(p.to) - dayNumber(p.from) + 1;
}

/** The last `n` days, today included (today is partial). */
export function rollingDays(n: number, today: string = simToday()): Period {
  return { from: addDays(today, -(n - 1)), to: today };
}

/** The calendar month of a day ("187 paid orders · September"). */
export function calendarMonth(day: string = simToday()): Period {
  const y = Number(day.slice(0, 4)), m = Number(day.slice(5, 7));
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${day.slice(0, 7)}-01`, to: `${day.slice(0, 7)}-${String(last).padStart(2, "0")}` };
}

/** The period of the same length just before ("vs previous 30 days"). */
export function previousPeriod(p: Period): Period {
  const n = periodDays(p);
  return { from: addDays(p.from, -n), to: addDays(p.from, -1) };
}

/** Every Paris day of a period, oldest first. */
export function daysOf(p: Period): string[] {
  return Array.from({ length: periodDays(p) }, (_, i) => addDays(p.from, i));
}

/** Is this instant inside the period (by its Paris day)? */
export function inPeriod(at: string | Date, p: Period): boolean {
  const d = parisDay(at);
  return d >= p.from && d <= p.to;
}

/** "Oct 6", with the year only when it is not the current one. */
export function dayLabel(day: string, today: string = simToday()): string {
  const label = `${MONTHS[Number(day.slice(5, 7)) - 1]} ${Number(day.slice(8, 10))}`;
  return day.slice(0, 4) === today.slice(0, 4) ? label : `${label}, ${day.slice(0, 4)}`;
}

/** "Sep 6 – Oct 5" */
export function periodLabel(p: Period, today: string = simToday()): string {
  return p.from === p.to ? dayLabel(p.from, today) : `${dayLabel(p.from, today)} – ${dayLabel(p.to, today)}`;
}
