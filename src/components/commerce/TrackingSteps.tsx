import { cn } from "@/lib/cn";

export interface TrackingStepView {
  label: string;
  /** "Oct 1, 14:02"; empty for steps to come. */
  time: string;
  done: boolean;
  /** The last step reached: drawn 500. */
  current: boolean;
}

/**
 * Parcel timeline (Tracking, MTracking). A 10 px dot per step, filled Ink once reached, hollow
 * after; the thread under a dot is Ink when the next step is reached, Line-grey otherwise. Desktop:
 * time in a 160 px right column, 56 px rows. Phone: time under the label, 52 px rows.
 */
export function TrackingSteps({ steps, variant = "desktop" }: { steps: TrackingStepView[]; variant?: "desktop" | "phone" }) {
  const phone = variant === "phone";
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {steps.map((s, i) => {
        const next = steps[i + 1];
        const label = (
          <span className={cn(s.current && "font-medium", !s.done && "text-fg-muted")}>
            {s.label}
            <span className="sr-only">{s.current ? ", latest step" : s.done ? "" : ", to come"}</span>
          </span>
        );
        return (
          <li
            key={s.label}
            aria-current={s.current ? "step" : undefined}
            className={cn("grid items-start", phone ? "min-h-52 grid-cols-[22px_1fr] gap-x-10" : "min-h-56 grid-cols-[24px_1fr_160px] gap-x-12")}
          >
            <span aria-hidden="true" className="flex h-full flex-col items-center">
              <span className={cn("mt-5 size-10 rounded-full border border-fg", s.done ? "bg-fg" : "bg-bg")} />
              {next && <span className={cn("w-1 flex-1", next.done ? "bg-fg" : "bg-border-field")} />}
            </span>
            {phone ? (
              <span className="flex flex-col">
                {label}
                <span className="text-fg-muted">{s.time}</span>
              </span>
            ) : (
              <>
                {label}
                <span className="text-right text-fg-muted">{s.time}</span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
