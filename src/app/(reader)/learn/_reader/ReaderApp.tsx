"use client";

/**
 * /learn/[entitlementId] (GuideReader, AppStep), /timer (GuideReader drying view, AppTimer) and
 * /print (AppPrint, Guide01–08). Private: client guard, then the entitlement of the signed-in
 * customer (someone else's or a refunded one shows "not in your library"). Progress goes through
 * `@/lib/client/progress` (markOpened, saveProgress, completeGuide, drying timer), which the
 * Library reads too. Mock: docs/mock-plan.md §3, docs/decisions.md "Reader (M5)".
 */
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components";
import { getEntitlement, type Guide, type GuideLicense, type LibraryItem } from "@/lib/api";
import { keepGuideOffline, useHydrated, useInstallPrompt, usePurchases, useRequireCustomer } from "@/lib/client";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { PrintView } from "./PrintView";
import { StepView } from "./StepView";
import { TimerView } from "./TimerView";

export type ReaderRoute = "step" | "timer" | "print";

export interface ReaderData {
  item: LibraryItem;
  guide: Guide;
  license: GuideLicense;
}

type Load = { status: "loading" } | { status: "missing" } | { status: "ready"; data: ReaderData };

/** Desktop focus mode from 1024 px (a tablet on its side, next to the canvas); AppStep below. */
export const WIDE = "(min-width: 1024px)";

export function ReaderApp({ id, route }: { id: string; route: ReaderRoute }) {
  const hydrated = useHydrated();
  const auth = useRequireCustomer();
  const purchases = usePurchases();
  const userId = auth.status === "signed_in" ? auth.session.userId : null;
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (!userId) return;
    let live = true;
    void getEntitlement(id, userId).then((data) => live && setLoad(data ? { status: "ready", data } : { status: "missing" }));
    return () => {
      live = false;
    };
  }, [id, userId, purchases.entitlements]);

  if (!hydrated || !userId || load.status === "loading") {
    return (
      <div aria-busy="true" className="flex h-dvh flex-col gap-16 p-16 lg:p-32">
        <span className="sr-only">Loading your guide</span>
        <div className="h-28 bg-surface-muted" />
        <div className="flex-1 bg-surface-muted" />
      </div>
    );
  }
  if (load.status === "missing") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-480 flex-col items-start justify-center gap-12 px-16">
        <h1 className="text-xs font-medium tracking-normal">This guide is not in your library.</h1>
        <p className="m-0 text-fg-muted">It may belong to another account, or it was refunded. Your guides are in your library.</p>
        <ButtonLink href="/account" variant="ghost">Open my library</ButtonLink>
      </main>
    );
  }
  return <Reader data={load.data} route={route} />;
}

function Reader({ data, route }: { data: ReaderData; route: ReaderRoute }) {
  const wide = useMediaQuery(WIDE);
  const online = useOnline();
  const install = useInstallPrompt();
  const id = data.item.entitlementId;
  // Once a guide is open online, its step, timer and print pages are kept for offline use (M8).
  useEffect(() => {
    void keepGuideOffline(id);
  }, [id]);
  return (
    <>
      {!online && (
        <p role="status" className="m-0 bg-surface-muted px-16 py-8 text-center print:hidden">
          Offline — your guides are saved on this device
        </p>
      )}
      {/* Phone, once a guide is open: a quiet line, never a modal (docs/screens/reader.md §PWA). */}
      {online && install && !wide && (
        <p className="m-0 flex items-center justify-between gap-12 bg-surface-muted pl-16 print:hidden">
          <span>Install Geste to paint offline</span>
          <span className="flex">
            <button type="button" onClick={install.dismiss} className="min-h-44 px-12 text-fg-muted hover:text-fg">Not now</button>
            <button type="button" onClick={() => void install.install()} className="min-h-44 px-16 underline underline-offset-3 hover:text-fg-muted">Install</button>
          </span>
        </p>
      )}
      {route === "step" && <StepView data={data} wide={wide} />}
      {route === "timer" && <TimerView data={data} wide={wide} />}
      {route === "print" && <PrintView data={data} wide={wide} />}
    </>
  );
}

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  return online;
}

/** Paths of the reader (trailing slash: the export serves /learn/x/index.html). */
export const readerPath = {
  step: (id: string, step?: string) => `/learn/${id}/${step ? `?step=${step}` : ""}`,
  timer: (id: string, layer: number) => `/learn/${id}/timer/?layer=${layer}`,
  print: (id: string, from?: "library") => `/learn/${id}/print/${from ? `?from=${from}` : ""}`,
};
