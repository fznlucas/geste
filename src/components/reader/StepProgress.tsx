"use client";

import { cn } from "@/lib/cn";

export interface StepProgressProps {
  /** Step ids in order, e.g. ["1a","1b",…,"3e"]. */
  steps: string[];
  current: number; // index
  onGo: (index: number) => void;
}

/**
 * 15 segments in one row, 2 px gaps, grouped by layer (6 px gap between layers).
 * Done: Ink. Current: Ink, taller (6 px vs 4 px). Upcoming: Line. Every segment is a 44 px-tall button.
 */
export function StepProgress({ steps, current, onGo }: StepProgressProps) {
  return (
    <nav aria-label="Guide steps" className="flex w-full items-center">
      {steps.map((id, i) => {
        const newLayer = i > 0 && id[0] !== steps[i - 1]?.[0];
        return (
          <button
            key={id}
            type="button"
            onClick={() => onGo(i)}
            aria-label={`Step ${id}${i === current ? ", current" : i < current ? ", done" : ""}`}
            aria-current={i === current ? "step" : undefined}
            className={cn("group flex h-44 flex-1 items-center", newLayer ? "ml-6" : i > 0 && "ml-2")}
          >
            <span
              className={cn(
                "block w-full transition-[height,background-color] duration-step ease-standard",
                i < current && "h-4 bg-fg",
                i === current && "h-6 bg-fg",
                i > current && "h-4 bg-border group-hover:bg-border-field",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
