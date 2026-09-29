"use client";

import { useSyncExternalStore } from "react";

/**
 * True when the media query matches. False during the server render and hydration: use it in
 * client-only views (after `useHydrated()`), or for details that may switch after the first frame.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
