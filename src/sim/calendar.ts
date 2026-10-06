/**
 * The simulation's calendar (docs/admin-v2/01 §3): Paris days, French working days, weekday factors,
 * seasons, social spikes, newsletter sends, growth. Pure functions of the date.
 */
import { addDays, parisOffsetMinutes } from "@/lib/clock";
import {
  BASE_DAILY_ORDERS, BLACK_FRIDAY_FACTOR, DECEMBER, EPISODE_EVERY_DAYS, FIRST_CANVAS_EPISODES, GROWTH, HOLIDAY_LULL_FACTOR, JANUARY_FACTOR,
  NEWSLETTER, NEWSLETTER_DAY_FACTOR, SPIKE_FACTORS, SUMMER_FACTOR, WEEKDAY_FACTORS,
} from "./config";

const parts = (day: string) => day.split("-").map(Number) as [number, number, number];
const yearOf = (day: string) => Number(day.slice(0, 4));
const utcCache = new Map<string, number>();
const utc = (day: string) => {
  let t = utcCache.get(day);
  if (t === undefined) {
    const [y, m, d] = parts(day);
    t = Date.UTC(y, m - 1, d);
    utcCache.set(day, t);
  }
  return t;
};

/** 0 = Monday … 6 = Sunday. */
export function weekday(day: string): number {
  return (new Date(utc(day)).getUTCDay() + 6) % 7;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / 86_400_000);
}

export const monthOf = (day: string) => day.slice(0, 7);

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

// ── Paris instants ────────────────────────────────────────────────────────────

const offsets = new Map<string, number>();

/** Paris offset of a day (read at noon; the 02:00/03:00 DST jumps only move night-time rows by an hour). */
function offsetOf(day: string): number {
  let o = offsets.get(day);
  if (o === undefined) {
    o = parisOffsetMinutes(utc(day) + 12 * 3_600_000);
    offsets.set(day, o);
  }
  return o;
}

/** ISO instant of a Paris wall-clock time; `hour` may be fractional (13.5 = 13:30). */
export function parisInstant(day: string, hour: number): string {
  const ms = utc(day) + Math.round((hour * 3_600_000) / 1000) * 1000 - offsetOf(day) * 60_000;
  return new Date(ms).toISOString().slice(0, 19) + "Z";
}

// ── Working days ──────────────────────────────────────────────────────────────

/** Easter Sunday (anonymous Gregorian algorithm). */
function easter(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), dayOfMonth = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;
}

const holidayCache = new Map<number, Set<string>>();

/** French public holidays of a year. */
export function frenchHolidays(year: number): Set<string> {
  let set = holidayCache.get(year);
  if (!set) {
    const e = easter(year);
    set = new Set([
      `${year}-01-01`, addDays(e, 1), `${year}-05-01`, `${year}-05-08`, addDays(e, 39), addDays(e, 50),
      `${year}-07-14`, `${year}-08-15`, `${year}-11-01`, `${year}-11-11`, `${year}-12-25`,
    ]);
    holidayCache.set(year, set);
  }
  return set;
}

export function isWorkingDay(day: string): boolean {
  return weekday(day) < 5 && !frenchHolidays(yearOf(day)).has(day);
}

/** The n-th working day after `day` (n = 0: `day` itself if working, else the next one). */
export function workingDayAfter(day: string, n: number): string {
  let d = day;
  while (!isWorkingDay(d)) d = addDays(d, 1);
  for (let i = 0; i < n; i++) {
    d = addDays(d, 1);
    while (!isWorkingDay(d)) d = addDays(d, 1);
  }
  return d;
}

// ── Social spikes, newsletters, seasons ───────────────────────────────────────

/** "First canvas" episode days up to `until` (board's five, then every 14 days). */
export function episodeDays(until: string): string[] {
  const out = FIRST_CANVAS_EPISODES.filter((d) => d <= until);
  let next = addDays(FIRST_CANVAS_EPISODES[FIRST_CANVAS_EPISODES.length - 1]!, EPISODE_EVERY_DAYS);
  while (next <= until) {
    out.push(next);
    next = addDays(next, EPISODE_EVERY_DAYS);
  }
  return out;
}

const spikes = new Map<string, 0 | 1 | 2 | null>();

/** 0 on an episode day, 1 the day after, 2 the day after that; null otherwise. */
export function spikeIndex(day: string): 0 | 1 | 2 | null {
  let v = spikes.get(day);
  if (v === undefined) {
    v = null;
    for (const ep of episodeDays(day)) {
      const n = daysBetween(ep, day);
      if (n >= 0 && n <= 2) v = n as 0 | 1 | 2;
    }
    spikes.set(day, v);
  }
  return v;
}

/** The n-th given weekday (0 = Monday) of a month. */
function nthWeekday(month: string, wd: number, nth: number): string {
  const first = `${month}-01`;
  const offset = (wd - weekday(first) + 7) % 7;
  return addDays(first, offset + (nth - 1) * 7);
}

/** Fixture newsletters (July → September) and the simulated ones (2nd Tuesday from November 2026). */
const FIXTURE_SENDS = ["2026-07-14", "2026-08-11", "2026-09-08"];

export function newsletterSendDay(month: string): string | null {
  const fixture = FIXTURE_SENDS.find((d) => d.startsWith(month));
  if (fixture) return fixture;
  if (month < NEWSLETTER.firstSimMonth) return null;
  return nthWeekday(month, NEWSLETTER.weekday - 1, NEWSLETTER.nth);
}

const sendDays = new Map<string, string | null>();

export function isNewsletterDay(day: string): boolean {
  const month = monthOf(day);
  let d = sendDays.get(month);
  if (d === undefined) {
    d = newsletterSendDay(month);
    sendDays.set(month, d);
  }
  return d === day;
}

/** Monday of Black Friday week (the Friday after the 4th Thursday of November). */
function blackFridayWeek(year: number): [string, string] {
  const thanksgiving = nthWeekday(`${year}-11`, 3, 4);
  const friday = addDays(thanksgiving, 1);
  const monday = addDays(friday, -4);
  return [monday, addDays(monday, 6)];
}

export function isBlackFridayWeek(day: string): boolean {
  const [a, b] = blackFridayWeek(yearOf(day));
  return day >= a && day <= b;
}

/** December gift season (Dec 1–22). */
export function isGiftSeason(day: string): boolean {
  return day.slice(5, 7) === "12" && Number(day.slice(8, 10)) <= 22;
}

/** Calendar factor of a day: season × spike × newsletter (the weekday is apart). */
export function calendarFactor(day: string): number {
  const [y, m, d] = parts(day);
  let f = 1;
  if (isBlackFridayWeek(day)) f *= BLACK_FRIDAY_FACTOR;
  else if (m === 12 && d <= 22) f *= DECEMBER.factor;
  if ((m === 12 && d >= 24) || (m === 1 && d <= 2)) f *= HOLIDAY_LULL_FACTOR;
  else if (m === 1) f *= JANUARY_FACTOR;
  if ((m === 7 || m === 8) && y >= SUMMER_FACTOR.from) f *= SUMMER_FACTOR.factor;
  const s = spikeIndex(day);
  if (s !== null) f *= SPIKE_FACTORS[s];
  if (isNewsletterDay(day)) f *= NEWSLETTER_DAY_FACTOR;
  return f;
}

const MEAN_WEEKDAY = WEEKDAY_FACTORS.reduce((s, v) => s + v, 0) / 7;

/** Weekday factor normalised so a week averages 1. */
export function weekdayFactor(day: string): number {
  return WEEKDAY_FACTORS[weekday(day)]! / MEAN_WEEKDAY;
}

/** Growth index of a month relative to September 2026 (1 before the trend starts). */
export function growthIndex(month: string): number {
  if (month < GROWTH.firstMonth) return 1;
  let index = 1, pct = GROWTH.firstPct, m = GROWTH.firstMonth;
  while (m <= month) {
    index *= 1 + pct / 100;
    pct = Math.max(GROWTH.floorPct, pct + GROWTH.stepPct);
    m = addMonths(m, 1);
  }
  return index;
}

/** Expected paid orders of an unanchored day, before noise. */
export function expectedOrders(day: string): number {
  return BASE_DAILY_ORDERS * growthIndex(monthOf(day)) * weekdayFactor(day) * calendarFactor(day);
}

