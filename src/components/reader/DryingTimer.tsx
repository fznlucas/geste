"use client";

import { Button } from "../primitives/Button";
import { cn } from "@/lib/cn";
import { formatTimer } from "@/lib/format";

export interface DryingTimerProps {
  /** Seconds left. */
  left: number;
  /** Full drying time of the layer: the bar's 100 %. */
  total: number;
  /** "02" on desktop, "2" on the phone: "Layer 02 is drying". */
  layer: string;
  running: boolean;
  /** Desktop: the ghost "Pause" / "Start timer" under the text. The phone page places its own buttons. */
  onToggle?: () => void;
  variant?: "desktop" | "phone";
}

/**
 * Drying view (GuideReader timer, AppTimer): "Layer 02 is drying", the digits (96 px desktop,
 * 64 px phone, tabular, no animation), a 2 px bar filling up, the touch test. The parent keeps the
 * time (an end date, so a locked phone or a reload stays right) and re-renders every second.
 */
export function DryingTimer({ left, total, layer, running, onToggle, variant = "desktop" }: DryingTimerProps) {
  const desktop = variant === "desktop";
  const pct = Math.round((1 - left / Math.max(1, total)) * 100);
  const minutes = Math.ceil(left / 60);
  return (
    <section aria-label="Drying timer" className={cn("flex flex-col items-center text-center", desktop ? "gap-14" : "gap-12")}>
      <span className="text-fg-muted">Layer {layer} is drying</span>
      <span role="timer" aria-live="off" className={cn("tracking-display tabular-nums", desktop ? "text-2xl" : "text-timer")}>
        {formatTimer(left)}
      </span>
      <span className="sr-only" aria-live="polite">
        {left === 0 ? "Dry. You can start the next layer." : left % 300 === 0 ? `${minutes} minutes left` : ""}
      </span>
      <span aria-hidden="true" className={cn("relative mt-8 h-2 bg-border", desktop ? "w-280" : "w-200")}>
        <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${pct}%` }} />
      </span>
      <p className={cn("m-0 text-fg-muted", desktop ? "mt-12 max-w-360" : "mt-16")}>Touch test: if the canvas feels cool, it is still wet. Wash your brushes meanwhile.</p>
      {desktop && onToggle && (
        <Button variant="ghost" onClick={onToggle} disabled={left === 0} className="mt-8 min-w-160">
          {running ? "Pause" : "Start timer"}
        </Button>
      )}
    </section>
  );
}
