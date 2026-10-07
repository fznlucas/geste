/**
 * The one "now" of the app — store, reader and admin (docs/admin-v2/01 §1). The first that is set wins:
 *
 * 1. `?simNow=2026-10-02T12:00:00Z` in the URL, kept for the tab in sessionStorage ("geste.simnow.v1")
 *    and shown in the admin top bar so it is never forgotten (`?simNow=real` clears it);
 * 2. `NEXT_PUBLIC_SIM_NOW` at build time (`npm run build:e2e`, unit tests), so tests are stable;
 * 3. real time.
 *
 * Business days are Europe/Paris days (orders, URSSAF, payouts); stored timestamps stay ISO UTC.
 * Wall-clock things stay on real time on purpose: the reader's drying countdown, cookie consent and
 * sign-in timestamps.
 */

export const PARIS = "Europe/Paris";

const SESSION_KEY = "geste.simnow.v1";
const BUILD_NOW = process.env.NEXT_PUBLIC_SIM_NOW;

export type ClockSource = "url" | "build" | "real";

function parse(v: string | null | undefined): number | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** undefined = not read yet in this page; null = no override. */
let override: number | null | undefined;
const listeners = new Set<() => void>();

function readOverride(): number | null {
  if (typeof window === "undefined") return null;
  if (override !== undefined) return override;
  let fromUrl: string | null = null;
  try {
    fromUrl = new URLSearchParams(window.location.search).get("simNow");
  } catch {
    // No location (tests).
  }
  let value: number | null = null;
  try {
    if (fromUrl !== null) {
      const t = parse(fromUrl);
      if (t === null) window.sessionStorage.removeItem(SESSION_KEY);
      else window.sessionStorage.setItem(SESSION_KEY, new Date(t).toISOString());
    }
    value = parse(window.sessionStorage.getItem(SESSION_KEY));
  } catch {
    // Storage blocked: the URL still sets the clock for this page.
    value = parse(fromUrl);
  }
  override = value;
  return value;
}

/** What "now" is for the whole app. */
export function simNow(): Date {
  const o = readOverride();
  if (o !== null) return new Date(o);
  const b = parse(BUILD_NOW);
  if (b !== null) return new Date(b);
  return new Date();
}

export function simNowIso(): string {
  return simNow().toISOString();
}

/** Where "now" comes from (the admin top bar shows a chip for "url"). */
export function clockSource(): ClockSource {
  if (readOverride() !== null) return "url";
  return parse(BUILD_NOW) !== null ? "build" : "real";
}

/** The session override, ISO, or null when the clock is the build's or real time. */
export function clockOverride(): string | null {
  const o = readOverride();
  return o === null ? null : new Date(o).toISOString();
}

/** Settings › Simulation and the top-bar chip: fix the clock for this tab, or `null` to go back. */
export function setClockOverride(iso: string | null) {
  const t = parse(iso);
  try {
    if (t === null) window.sessionStorage.removeItem(SESSION_KEY);
    else window.sessionStorage.setItem(SESSION_KEY, new Date(t).toISOString());
  } catch {
    // Memory only.
  }
  override = t;
  for (const l of listeners) l();
}

export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── Europe/Paris days ─────────────────────────────────────────────────────────

/**
 * Summer time in Paris is the EU rule (since 1996): from the last Sunday of March, 01:00 UTC, to the
 * last Sunday of October, 01:00 UTC. Computed, not read from Intl: the simulation asks this for every
 * row, and Intl.DateTimeFormat is far too slow for that (the unit tests check both agree).
 */
const lastSundayUtc = (year: number, month: number) => {
  const last = new Date(Date.UTC(year, month + 1, 0));
  return Date.UTC(year, month, last.getUTCDate() - last.getUTCDay(), 1);
};
const dstCache = new Map<number, [number, number]>();
function summerTime(t: number): boolean {
  const year = new Date(t).getUTCFullYear();
  let range = dstCache.get(year);
  if (!range) {
    range = [lastSundayUtc(year, 2), lastSundayUtc(year, 9)];
    dstCache.set(year, range);
  }
  return t >= range[0] && t < range[1];
}

/** Paris wall clock of an instant. */
export function parisParts(at: Date | string | number): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const t = typeof at === "number" ? at : new Date(at).getTime();
  const d = new Date(t + (summerTime(t) ? 120 : 60) * 60_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
}

const pad = (n: number) => String(n).padStart(2, "0");

const dayOfHour = new Map<number, string>();

/**
 * "2026-10-02": the Paris day of an instant. Remembered per UTC hour: Paris changes day and offset only on
 * the hour, so every instant of one UTC hour is on the same Paris day (the simulation asks millions of times).
 */
export function parisDay(at: Date | string | number): string {
  const t = typeof at === "number" ? at : new Date(at).getTime();
  const hour = Math.floor(t / 3_600_000);
  let day = dayOfHour.get(hour);
  if (day === undefined) {
    day = new Date(t + (summerTime(t) ? 120 : 60) * 60_000).toISOString().slice(0, 10);
    if (dayOfHour.size > 500_000) dayOfHour.clear();
    dayOfHour.set(hour, day);
  }
  return day;
}

/** Today in Paris, by the simulated clock. */
export function simToday(): string {
  return parisDay(simNow());
}

/** Minutes Paris is ahead of UTC at an instant (60 in winter, 120 in summer). */
export function parisOffsetMinutes(at: Date | string | number): number {
  return summerTime(new Date(at).getTime()) ? 120 : 60;
}

/** The instant a Paris day starts (midnight is never inside a DST jump in Paris). */
export function startOfDayParis(day: string): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const utcMidnight = Date.UTC(y, m - 1, d);
  const first = utcMidnight - parisOffsetMinutes(utcMidnight) * 60_000;
  return new Date(utcMidnight - parisOffsetMinutes(first) * 60_000);
}

const added = new Map<string, string>();

/** "2026-10-02" + n days (cached: the simulation asks for the same days hundreds of thousands of times). */
export function addDays(day: string, n: number): string {
  const key = `${day}|${n}`;
  let out = added.get(key);
  if (out === undefined) {
    const [y, m, d] = day.split("-").map(Number) as [number, number, number];
    const t = new Date(Date.UTC(y, m - 1, d + n));
    out = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
    if (added.size > 200_000) added.clear();
    added.set(key, out);
  }
  return out;
}

/** Hour of the day in Paris (the dashboard greeting). */
export function parisHour(at: Date | string | number = simNow()): number {
  return parisParts(at).hour;
}
