"use client";

import { useRouter, useSearchParams } from "next/navigation";

/** "Social calendar" → "social-calendar" (the `?tab=` value). */
export const tabSlug = (tab: string) => tab.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The page's tab in the URL (`?tab=affiliate`), so a link from another page opens the right one and the
 * back button returns to it. Other query values are kept.
 */
export function useTabParam<T extends string>(tabs: readonly T[], fallback: T): [T, (t: T) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const wanted = params.get("tab") ?? "";
  const tab = tabs.find((t) => tabSlug(t) === tabSlug(wanted) || t === wanted) ?? fallback;
  const setTab = (t: T) => {
    const next = new URLSearchParams(params.toString());
    if (t === fallback) next.delete("tab");
    else next.set("tab", tabSlug(t));
    next.delete("id");
    router.replace(`${window.location.pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  return [tab, setTab];
}
