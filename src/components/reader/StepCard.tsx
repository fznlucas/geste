import type { GuideStep } from "@/lib/types";
import { Plate } from "./PlateSwatch";
import { Icon } from "../brand/Icon";

/**
 * Right column of the reader (desktop) / body of AppStep (phone).
 * "Layer 02 · Gestures — Step c": Stone. Instruction: 22 px desktop, 14 px phone, max 34 ch.
 * Then brush, plate, and the tip in a Mist panel. The instruction is the only thing that must be read.
 */
export function StepCard({ step, total, index }: { step: GuideStep; total: number; index: number }) {
  return (
    <article aria-labelledby={`step-${step.id}`} className="flex flex-col gap-24">
      <span className="text-fg-muted">
        Layer {String(step.layer).padStart(2, "0")} · {step.layerName} — step {step.id.slice(1)} · {index + 1}/{total}
      </span>
      <p id={`step-${step.id}`} className="max-w-[34ch] text-sm lg:text-md">
        {step.text}
      </p>
      <div className="flex flex-col gap-10">
        <span className="inline-flex items-center gap-6 text-fg-muted">
          <Icon name="brush" /> {step.brush}
        </span>
        <Plate colours={step.plate} />
      </div>
      {step.tip && <p className="bg-surface-muted p-16">{step.tip}</p>}
    </article>
  );
}
