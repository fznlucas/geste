"use client";

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

/**
 * The guide's steps as 2 px segments, 4 px apart: Ink up to the current step, Line after
 * (GuideReader, AppStep). Each segment is a button ("Layer 02, step c", aria-current="step") whose
 * hit area reaches 44 px around the thin bar without moving the layout.
 */
export function StepProgress({ layers, current, onGo, variant = "desktop" }: StepProgressProps) {
  const order = layers.flat();
  const at = order.indexOf(current);
  const shown = variant === "phone" ? layers.filter((l) => l.includes(current)) : layers;
  return (
    <div role="list" aria-label="Steps" className={cn("flex", variant === "desktop" ? "gap-12" : "gap-4")}>
      {shown.map((steps) => (
        <div role="listitem" key={steps[0]} className="flex flex-1 gap-4">
          {steps.map((id) => {
            const done = order.indexOf(id) <= at;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onGo(id)}
                aria-label={`Layer ${id.slice(0, -1).padStart(2, "0")}, step ${id.slice(-1)}`}
                aria-current={id === current ? "step" : undefined}
                className={cn(
                  "group relative flex flex-1 cursor-pointer items-center outline-none",
                  "before:absolute before:inset-x-0 before:content-['']",
                  "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg",
                  // Phone: a 24 px button drawn as its 2 px bar (negative margins keep the board's layout).
                  variant === "desktop" ? "min-h-20 before:-inset-y-12" : "-my-11 h-24 before:-inset-y-10",
                )}
              >
                <span
                  className={cn(
                    "block h-2 w-full transition-colors duration-step ease-standard",
                    done ? "bg-fg" : "bg-border group-hover:bg-border-field",
                  )}
                />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
