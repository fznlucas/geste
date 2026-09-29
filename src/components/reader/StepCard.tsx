import type { PlateColour } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Plate } from "./PlateSwatch";

export interface StepCardProps {
  /** "2c" */
  id: string;
  /** Letter of the layer's last step: "Step c of e". */
  lastLetter: string;
  /** Desktop: the layer's brushes ("50 mm · 25 mm · round n°6"); phone: this step's ("Round n°6"). */
  brush: string;
  text: string;
  /** Desktop only. */
  plate?: PlateColour[];
  tip?: string;
  variant?: "desktop" | "phone";
  className?: string;
}

/**
 * The step being painted. Desktop (GuideReader): "Step c of e" + brushes, the instruction at 22 px,
 * "On the plate", "Tip · …", 28 px apart. Phone (AppStep): the same first line and the instruction
 * at 14 px, 10 px apart. The instruction is announced when the step changes.
 */
export function StepCard({ id, lastLetter, brush, text, plate, tip, variant = "desktop", className }: StepCardProps) {
  const desktop = variant === "desktop";
  return (
    <article aria-labelledby={`step-${id}`} className={cn("flex flex-col", desktop ? "gap-28" : "gap-10", className)}>
      <div className="flex justify-between gap-16">
        <span className="font-medium">
          Step {id.slice(-1)} of {lastLetter}
        </span>
        <span className="text-right text-fg-muted">{brush}</span>
      </div>
      <p id={`step-${id}`} aria-live="polite" className={cn("m-0 text-pretty", desktop ? "text-reader tracking-reader" : "text-sm")}>
        {text}
      </p>
      {desktop && plate && plate.length > 0 && <Plate colours={plate} />}
      {desktop && tip && <span className="text-fg-muted">Tip · {tip}</span>}
    </article>
  );
}
