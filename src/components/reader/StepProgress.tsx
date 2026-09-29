"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { cn } from "@/lib/cn";

export interface StepProgressProps {
  /** Step ids in order, e.g. ["1a","1b",…,"3e"]. */
  steps: string[];
  current: number; // index
  onGo: (index: number) => void;
}

/**
 * 15 segments in one row, 2 px gaps, grouped by layer (6 px gap between layers).
 * Done: Ink. Current: Ink, taller (6 px vs 4 px). Upcoming: Line.
 * One 44 px-tall slider across the row (a phone is too narrow for 15 separate 24 px targets,
 * WCAG 2.2 target size): click a segment to jump to it, arrows / Home / End from the keyboard.
 */
export function StepProgress({ steps, current, onGo }: StepProgressProps) {
  const last = steps.length - 1;
  const go = (i: number) => onGo(Math.max(0, Math.min(last, i)));
  const onKeyDown = (e: KeyboardEvent) => {
    const next = { ArrowRight: current + 1, ArrowUp: current + 1, ArrowLeft: current - 1, ArrowDown: current - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    go(next);
  };
  // Nearest segment to the pointer, so the gaps between segments work too.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const segs = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-seg]")];
    const dist = segs.map((s) => {
      const r = s.getBoundingClientRect();
      return e.clientX < r.left ? r.left - e.clientX : e.clientX > r.right ? e.clientX - r.right : 0;
    });
    go(dist.indexOf(Math.min(...dist)));
  };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Guide steps"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={current + 1}
      aria-valuetext={`Step ${steps[current]}, ${current + 1} of ${steps.length}`}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className="flex h-44 w-full cursor-pointer items-center outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      {steps.map((id, i) => {
        const newLayer = i > 0 && id[0] !== steps[i - 1]?.[0];
        return (
          <span key={id} data-seg className={cn("group flex h-full flex-1 items-center", newLayer ? "ml-6" : i > 0 && "ml-2")}>
            <span
              className={cn(
                "block w-full transition-[height,background-color] duration-step ease-standard",
                i < current && "h-4 bg-fg",
                i === current && "h-6 bg-fg",
                i > current && "h-4 bg-border group-hover:bg-border-field",
              )}
            />
          </span>
        );
      })}
    </div>
  );
}
