"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { cn } from "@/lib/cn";

export interface StepProgressProps {
  /** Step ids per layer, in order: [["1a",…,"1e"], ["2a",…], …]. */
  layers: string[][];
  /** Current step id, "2c". */
  current: string;
  onGo: (id: string) => void;
  /** desktop: every layer, 12 px between layers (GuideReader). phone: the current layer only (AppStep). */
  variant?: "desktop" | "phone";
}

const stepName = (id: string) => `Layer ${id.slice(0, -1).padStart(2, "0")}, step ${id.slice(-1)}`;

/**
 * The guide's steps as 2 px segments, 4 px apart: Ink up to the current step, Line after
 * (GuideReader, AppStep). One slider for the whole bar (docs/decisions.md "Reader step bar"):
 * a click goes to the nearest segment, ← → ↑ ↓ move one step, Page Up / Page Down one layer,
 * Home / End the first and last step. One 24 px-tall target, whatever the width, drawn as its
 * 2 px bars (negative margins keep the boards' layout).
 */
export function StepProgress({ layers, current, onGo, variant = "desktop" }: StepProgressProps) {
  const order = layers.flat();
  const at = Math.max(0, order.indexOf(current));
  const layerAt = layers.findIndex((l) => l.includes(current));
  const shown = variant === "phone" ? layers.filter((l) => l.includes(current)) : layers;

  const go = (i: number) => {
    const id = order[Math.min(order.length - 1, Math.max(0, i))]!;
    if (id !== current) onGo(id);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const firstOf = (l: number) => order.indexOf(layers[Math.min(layers.length - 1, Math.max(0, l))]![0]!);
    const to: Record<string, number> = {
      ArrowRight: at + 1,
      ArrowUp: at + 1,
      ArrowLeft: at - 1,
      ArrowDown: at - 1,
      PageUp: firstOf(layerAt + 1),
      PageDown: firstOf(order[at] === layers[layerAt]![0] ? layerAt - 1 : layerAt),
      Home: 0,
      End: order.length - 1,
    };
    if (!(e.key in to) || e.altKey || e.ctrlKey || e.metaKey) return;
    // Handled here: the reader's own ← → listener skips prevented events.
    e.preventDefault();
    go(to[e.key]!);
  };

  // The nearest drawn segment to the pointer (gaps and the stretched hit area included).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    let best: { id: string; d: number } | null = null;
    for (const el of e.currentTarget.querySelectorAll<HTMLElement>("[data-step]")) {
      const r = el.getBoundingClientRect();
      const d = e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0;
      if (!best || d < best.d) best = { id: el.dataset.step!, d };
    }
    if (best) go(order.indexOf(best.id));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Steps"
      aria-orientation="horizontal"
      aria-valuemin={1}
      aria-valuemax={order.length}
      aria-valuenow={at + 1}
      aria-valuetext={`${stepName(order[at]!)} · ${at + 1} of ${order.length}`}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className={cn(
        "relative flex h-24 cursor-pointer outline-none",
        "before:absolute before:inset-x-0 before:-inset-y-10 before:content-['']",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg",
        variant === "desktop" ? "-my-2 gap-12" : "-my-11 gap-4",
      )}
    >
      {shown.map((steps) => (
        <div key={steps[0]} className="flex flex-1 items-center gap-4">
          {steps.map((id) => (
            <span
              key={id}
              data-step={id}
              aria-hidden="true"
              className={cn(
                "relative block h-2 flex-1 transition-colors duration-step ease-standard",
                order.indexOf(id) <= at ? "bg-fg" : "bg-border hover:bg-border-field",
                // Hovering a segment lights its whole column, not only the 2 px bar.
                "before:absolute before:inset-x-0 before:-inset-y-11 before:content-['']",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
