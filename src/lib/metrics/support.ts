/** Support metrics (AdminSupport). */
import { metric } from "./define";

/**
 * "Average first reply this week: 3h 10". Phase 1: the board's figure; Phase 5 computes the median
 * time to the first staff reply over the last 7 days from the thread messages.
 */
export const firstReplyMinutes = metric("Median time between a customer's first message and the first staff reply, last 7 days.", function firstReplyMinutes(): number {
  return 190;
});

/** "3h 10", "45 min" */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const m = minutes % 60;
  return `${Math.floor(minutes / 60)}h ${String(m).padStart(2, "0")}`;
}
