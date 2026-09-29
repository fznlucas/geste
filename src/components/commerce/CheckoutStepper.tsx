"use client";

import { cn } from "@/lib/cn";

export type CheckoutStep = "contact" | "shipping" | "payment" | "confirmation";

export const STEP_LABELS: Record<CheckoutStep, string> = {
  contact: "Contact",
  shipping: "Shipping",
  payment: "Payment",
  confirmation: "Confirmation",
};

/** MCheckout: shorter last label, no numbers. */
const PHONE_LABELS: Record<CheckoutStep, string> = { ...STEP_LABELS, confirmation: "Done" };

export interface CheckoutStepperProps {
  steps: CheckoutStep[]; // shipping is dropped when the cart has no print
  current: CheckoutStep;
  /** Steps the buyer can click: the ones reached and the next one (it validates first). None after confirmation. */
  clickable: CheckoutStep[];
  /** Steps left with errors: Signal bar and text, " — incomplete" (desktop). */
  errors?: CheckoutStep[];
  onGo: (s: CheckoutStep) => void;
  /** desktop = Checkout board ("01 Contact", 2 px bar above); phone = MCheckout ("Contact", tighter). */
  variant?: "desktop" | "phone";
}

/**
 * One column per step with a 2 px bar above its label (boards Checkout, MCheckout). Bar: Ink up to
 * the current step, Line after, Signal on a step with errors. Text: Ink for the current step,
 * Stone otherwise, Signal with errors. After confirmation nothing is clickable.
 */
export function CheckoutStepper({ steps, current, clickable, errors = [], onGo, variant = "desktop" }: CheckoutStepperProps) {
  const phone = variant === "phone";
  const currentIndex = steps.indexOf(current);
  return (
    <ol aria-label="Checkout steps" className={cn("grid", phone ? "gap-x-6" : "gap-x-8")} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s, i) => {
        const isCur = s === current;
        const err = errors.includes(s);
        const bar = err ? "bg-danger" : i <= currentIndex ? "bg-fg" : "bg-border";
        const text = err ? "text-danger" : isCur ? "text-fg" : "text-fg-muted";
        const label = phone ? PHONE_LABELS[s] : `${String(i + 1).padStart(2, "0")} ${STEP_LABELS[s]}`;
        const content = (
          <>
            {label}
            {err && (phone ? <span className="sr-only"> — incomplete</span> : " — incomplete")}
          </>
        );
        const canGo = clickable.includes(s) && !isCur;
        if (phone) {
          const cls = cn("flex min-h-32 flex-col items-stretch gap-6 text-left", text);
          return (
            <li key={s} className="flex">
              {canGo ? (
                <button type="button" onClick={() => onGo(s)} className={cn(cls, "w-full hover:text-fg")}>
                  <span aria-hidden="true" className={cn("h-2", bar)} />
                  <span>{content}</span>
                </button>
              ) : (
                <span aria-current={isCur ? "step" : undefined} className={cn(cls, "w-full")}>
                  <span aria-hidden="true" className={cn("h-2", bar)} />
                  <span>{content}</span>
                </span>
              )}
            </li>
          );
        }
        return (
          <li key={s} className="flex flex-col gap-8">
            <span aria-hidden="true" className={cn("h-2", bar)} />
            {canGo ? (
              <button type="button" onClick={() => onGo(s)} className={cn("inline-flex min-h-24 items-center self-start hover:text-fg hover:underline hover:underline-offset-4", text)}>
                {content}
              </button>
            ) : (
              <span aria-current={isCur ? "step" : undefined} className={cn("flex min-h-24 items-center", text)}>
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
