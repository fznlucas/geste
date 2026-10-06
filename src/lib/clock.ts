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

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: PARIS, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

/** Paris wall clock of an instant. */
export function parisParts(at: Date | string | number): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const p: Record<string, number> = {};
  for (const part of partsFormat.formatToParts(new Date(at))) if (part.type !== "literal") p[part.type] = Number(part.value);
  return { year: p.year!, month: p.month!, day: p.day!, hour: p.hour!, minute: p.minute!, second: p.second! };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-10-02": the Paris day of an instant. */
export function parisDay(at: Date | string | number): string {
  const p = parisParts(at);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Today in Paris, by the simulated clock. */
export function simToday(): string {
  return parisDay(simNow());
}

/** Minutes Paris is ahead of UTC at an instant (60 in winter, 120 in summer). */
export function parisOffsetMinutes(at: Date | string | number): number {
  const t = new Date(at).getTime();
  const p = parisParts(t);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((wall - Math.floor(t / 1000) * 1000) / 60_000);
}

/** The instant a Paris day starts (midnight is never inside a DST jump in Paris). */
export function startOfDayParis(day: string): Date {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const utcMidnight = Date.UTC(y, m - 1, d);
  const first = utcMidnight - parisOffsetMinutes(utcMidnight) * 60_000;
  return new Date(utcMidnight - parisOffsetMinutes(first) * 60_000);
}

/** "2026-10-02" + n days. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Hour of the day in Paris (the dashboard greeting). */
export function parisHour(at: Date | string | number = simNow()): number {
  return parisParts(at).hour;
}
