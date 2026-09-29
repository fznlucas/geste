"use client";

/**
 * Cookie consent (Legal / MLegal "Cookie settings"), kept in the browser as it will be after launch
 * (a first-party cookie then; `geste.cookies.v1` in the mock). Essential cookies (cart, login) are
 * always on. Analytics (PostHog) and ads read `cookieConsent()` before loading.
 */
import { createPersistentStore, isRecord, useStore } from "./store";

export interface CookieConsent {
  /** "Audience measurement". */
  audience: boolean;
  /** "Social media and ads". */
  ads: boolean;
  /** null until the visitor saves a choice. */
  savedAt: string | null;
}

/** The board's defaults: audience on, ads off. */
export const DEFAULT_COOKIE_CONSENT: CookieConsent = { audience: true, ads: false, savedAt: null };

const consentStore = createPersistentStore<CookieConsent>("cookies", 1, DEFAULT_COOKIE_CONSENT, (raw) =>
  isRecord(raw) && typeof raw.audience === "boolean" && typeof raw.ads === "boolean" && typeof raw.savedAt === "string"
    ? { audience: raw.audience, ads: raw.ads, savedAt: raw.savedAt }
    : null,
);

export function saveCookieConsent(choice: Pick<CookieConsent, "audience" | "ads">) {
  consentStore.set({ ...choice, savedAt: new Date().toISOString() });
}

export function cookieConsent(): CookieConsent {
  return consentStore.get();
}

export function useCookieConsent(): CookieConsent {
  return useStore(consentStore);
}
