"use client";

/**
 * The simulated history arrives from a Web Worker (docs/admin-v2/01 §2): these hooks re-render when it
 * does. Until then pages show their Mist blocks; writes wait for it (`whenSimReady`).
 */
import { useSyncExternalStore } from "react";
import { simPending, simVersion, subscribeSim } from "@/lib/api";

export { whenSimReady } from "@/lib/api";

/** Changes when the history arrives or is reset: a dependency for memos. */
export function useSimVersion(): number {
  return useSyncExternalStore(subscribeSim, simVersion, () => 0);
}

/** False while the worker brings the history (and during the server render: the static pages have none). */
export function useSimReady(): boolean {
  return useSyncExternalStore(subscribeSim, () => !simPending(), () => false);
}
