"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import { createPersistentStore, isRecord, useStore } from "./store";

/**
 * The reader as an installed app (docs/screens/reader.md §PWA): the service worker (src/sw/sw.ts,
 * built into sw.js by `serwist build`) and the install line. Production builds only: `next dev`
 * has no sw.js.
 */
const enabled = () => typeof navigator !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production";

/** Registers the reader's worker (scope <base>/learn/) and asks it to keep this guide's pages offline. */
export async function keepGuideOffline(entitlementId: string): Promise<void> {
  if (!enabled() || !navigator.onLine) return;
  try {
    await navigator.serviceWorker.register(asset("sw.js"), { scope: asset("learn/") });
    const reg = await navigator.serviceWorker.ready;
    const urls = ["", "timer/", "print/"].map((p) => asset(`learn/${entitlementId}/${p}`));
    reg.active?.postMessage({ type: "WARM_GUIDE", urls: [asset("learn/"), ...urls] });
  } catch {
    // Private windows and blocked storage: the reader still works online.
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** "Not now" is remembered on this device. */
const installStore = createPersistentStore<{ dismissed: boolean }>("install", 1, { dismissed: false }, (raw) =>
  isRecord(raw) && typeof raw.dismissed === "boolean" ? { dismissed: raw.dismissed } : null,
);

/**
 * The browser's install offer (Chrome, Edge, Android). Null when there is none: already installed,
 * iOS Safari (Share › Add to Home Screen), or dismissed here.
 */
export function useInstallPrompt(): { install: () => Promise<void>; dismiss: () => void } | null {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const { dismissed } = useStore(installStore);
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const installed = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", on);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  if (!event || dismissed) return null;
  return {
    install: async () => {
      await event.prompt();
      await event.userChoice;
      setEvent(null);
    },
    dismiss: () => installStore.set({ dismissed: true }),
  };
}
