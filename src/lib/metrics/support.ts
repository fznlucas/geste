/** Support metrics (AdminSupport). */
import { simNow } from "@/lib/clock";
import { allSupportMessages, allSupportThreads } from "@/lib/api/local";
import { metric } from "./define";

/**
 * "Average first reply this week: 3h 10": median time between a customer's first message and the first
 * staff reply, for threads opened in the last 7 days that have a reply. Null when there is none.
 */
export const firstReplyMinutes = metric("Median time between a customer's first message and the first staff reply, threads opened in the last 7 days.", function firstReplyMinutes(): number | null {
  const since = simNow().getTime() - 7 * 86_400_000;
  const byThread = new Map<string, { first?: string; reply?: string }>();
  for (const m of allSupportMessages()) {
    const t = byThread.get(m.threadId) ?? {};
    if (m.from === "customer" && (!t.first || m.createdAt < t.first)) t.first = m.createdAt;
    if (m.from === "staff" && (!t.reply || m.createdAt < t.reply)) t.reply = m.createdAt;
    byThread.set(m.threadId, t);
  }
  const waits: number[] = [];
  for (const th of allSupportThreads()) {
    const t = byThread.get(th.id);
    if (!t?.first || !t.reply || Date.parse(th.createdAt) < since || t.reply < t.first) continue;
    waits.push((Date.parse(t.reply) - Date.parse(t.first)) / 60_000);
  }
  if (!waits.length) return null;
  waits.sort((a, b) => a - b);
  const mid = Math.floor(waits.length / 2);
  return Math.round(waits.length % 2 ? waits[mid]! : (waits[mid - 1]! + waits[mid]!) / 2);
});

/** "3h 10", "45 min" */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const m = minutes % 60;
  return `${Math.floor(minutes / 60)}h ${String(m).padStart(2, "0")}`;
}
