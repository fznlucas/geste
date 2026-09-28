"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../primitives/Button";
import { formatTimer } from "@/lib/format";

export interface DryingTimerProps {
  seconds: number;
  layerName: string;
  onDone?: () => void;
  onSkip: () => void;
}

/**
 * Full-width drying view: "Let layer 02 dry" · 96 px digits (tabular) · Pause/Resume ghost · "Skip, it's dry" text.
 * Counts down every second with no animation. Keeps time with Date.now() so a locked phone stays right.
 * At zero: one optional soft sound + a notification if the PWA has permission (asked on first timer, never before).
 */
export function DryingTimer({ seconds, layerName, onDone, onSkip }: DryingTimerProps) {
  const [left, setLeft] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const endAt = useRef(0); // set when the countdown (re)starts

  useEffect(() => {
    if (paused) return;
    endAt.current = Date.now() + left * 1000;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        onDone?.();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("Geste", { body: `${layerName} is dry. Next layer.` });
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <section aria-label="Drying timer" className="flex flex-col items-center gap-24 text-center">
      <span className="text-fg-muted">Let {layerName} dry</span>
      <span role="timer" aria-live="off" className="text-2xl tabular-nums">
        {formatTimer(left)}
      </span>
      <span className="sr-only" aria-live="polite">
        {left === 0 ? "Dry. Continue to the next layer." : left % 300 === 0 ? `${Math.round(left / 60)} minutes left` : ""}
      </span>
      <div className="flex gap-10">
        <Button variant="ghost" onClick={() => setPaused((p) => !p)} className="min-w-140">
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="text" onClick={onSkip}>
          Skip, it&apos;s dry
        </Button>
      </div>
    </section>
  );
}
