/**
 * Product events (docs/screens/*.md "Events"). Mock phase: no PostHog; each event is dispatched as a
 * `geste:track` DOM event so tests and the console can see it. Later: posthog.capture(event, props).
 */
export type AnalyticsEvent = "guide_opened" | "guide_step_viewed" | "guide_completed" | "guide_timer_started" | "guide_print_prepared";

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("geste:track", { detail: { event, ...props } }));
}
