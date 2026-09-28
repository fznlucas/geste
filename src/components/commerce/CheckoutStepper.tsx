"use client";

import { cn } from "@/lib/cn";

export type CheckoutStep = "contact" | "shipping" | "payment" | "confirmation";

export const STEP_LABELS: Record<CheckoutStep, string> = {
  contact: "Contact",
  shipping: "Shipping",
  payment: "Payment",
  confirmation: "Confirmation",
};

export interface CheckoutStepperProps {
  steps: CheckoutStep[]; // shipping is dropped when the cart has no print
  current: CheckoutStep;
  completed: CheckoutStep[];
  /** Steps with a validation error show a red dot and "needs attention". */
  errors?: CheckoutStep[];
  onGo: (s: CheckoutStep) => void;
}

/**
 * "01 Contact — 02 Shipping — 03 Payment — 04 Confirmation". Completed steps are clickable (go back
 * and edit), upcoming steps are not. Current: Ink + underline. Error: Signal text and dot.
 * After confirmation, no step is clickable.
 */
export function CheckoutStepper({ steps, current, completed, errors = [], onGo }: CheckoutStepperProps) {
  const done = current === "confirmation";
  return (
    <nav aria-label="Checkout steps">
      <ol className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {steps.map((s, i) => {
          const isCur = s === current;
          const isDone = completed.includes(s);
          const err = errors.includes(s);
          const clickable = isDone && !isCur && !done;
          const label = `${String(i + 1).padStart(2, "0")} ${STEP_LABELS[s]}`;
          return (
            <li key={s} className="flex items-center gap-8">
              {i > 0 && <span aria-hidden="true" className="h-px w-24 bg-border" />}
              {clickable ? (
                <button type="button" onClick={() => onGo(s)} className={cn("min-h-32 hover:underline hover:underline-offset-4", err ? "text-danger" : "text-fg")}>
                  {label} <span className="sr-only">(completed, edit)</span>
                </button>
              ) : (
                <span aria-current={isCur ? "step" : undefined} className={cn("inline-flex min-h-32 items-center gap-6", isCur ? "text-fg underline underline-offset-4" : isDone ? "text-fg" : "text-fg-muted", err && "text-danger")}>
                  {err && <span aria-hidden="true" className="size-6 rounded-full bg-danger" />}
                  {label}
                  {err && <span className="sr-only">needs attention</span>}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
