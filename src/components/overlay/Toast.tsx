"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { duration } from "@/lib/motion";

type Tone = "default" | "danger";
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}
interface ToastApi {
  show: (text: string, opts?: { tone?: Tone; ms?: number }) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

/**
 * Ink block bottom-right (desktop) or bottom-centre above the tab bar (phone). role=status.
 * Store: 4 s. Admin: 1.6 s. Danger tone: Signal block, role=alert, stays until dismissed.
 */
export function ToastProvider({ children, surface = "store" }: { children: ReactNode; surface?: "store" | "admin" }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const n = useRef(0);
  const show = useCallback<ToastApi["show"]>(
    (text, opts) => {
      const id = ++n.current;
      const tone = opts?.tone ?? "default";
      setItems((xs) => [...xs, { id, text, tone }]);
      if (tone !== "danger") {
        const ms = opts?.ms ?? (surface === "admin" ? duration.toastAdmin : duration.toastStore);
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), ms);
      }
    },
    [surface],
  );
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-24 left-16 right-16 z-toast flex flex-col items-center gap-8 md:left-auto md:right-32 md:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "danger" ? "alert" : "status"}
            className={`pointer-events-auto flex items-center gap-16 px-14 py-10 text-fg-inverse animate-[rise-in_240ms_var(--ease-standard)] ${t.tone === "danger" ? "bg-danger" : "bg-fg"}`}
          >
            {t.text}
            {t.tone === "danger" && (
              <button type="button" className="underline underline-offset-3" onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}>
                Dismiss
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
