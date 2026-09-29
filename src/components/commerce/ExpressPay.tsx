"use client";

import { Button } from "@/components/primitives/Button";
import { cn } from "@/lib/cn";

export type ExpressMethod = "apple_pay" | "google_pay" | "paypal";

const METHODS: Array<[ExpressMethod, string]> = [
  ["apple_pay", "Apple Pay"],
  ["google_pay", "Google Pay"],
  ["paypal", "PayPal"],
];

export interface ExpressPayProps {
  /** Mock: runs the success path with the wallet's details. Later: the Stripe Express Checkout Element. */
  onPay: (method: ExpressMethod) => void;
  /** The method being processed: its button shows the loading state, the others are disabled. */
  busy?: ExpressMethod | null;
  /** desktop = Checkout board (title + explainer on one line, divider below); phone = MCheckout. */
  variant?: "desktop" | "phone";
}

/**
 * Top of checkout step 1. One sentence explains what express pay does (validated after user confusion):
 * "One tap: your wallet fills in contact, address and payment". Three ghost buttons, then the
 * "or fill in step by step" divider (desktop).
 */
export function ExpressPay({ onPay, busy = null, variant = "desktop" }: ExpressPayProps) {
  const phone = variant === "phone";
  const buttons = (
    <div className={cn("flex", phone ? "gap-8" : "gap-12")}>
      {METHODS.map(([m, label]) => (
        <Button key={m} variant="ghost" className="grow" onClick={() => onPay(m)} disabled={busy !== null && busy !== m} loading={busy === m} aria-label={busy === m ? `${label}, processing` : undefined}>
          {busy === m ? "Processing…" : label}
        </Button>
      ))}
    </div>
  );
  if (phone) {
    return (
      <>
        <span className="text-fg-muted">Express checkout</span>
        {buttons}
      </>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-10">
        <div className="flex justify-between gap-12">
          <span className="font-medium">Express checkout</span>
          <span className="text-fg-muted">One tap: your wallet fills in contact, address and payment</span>
        </div>
        {buttons}
      </div>
      <div className="flex items-center gap-12 text-fg-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <span>or fill in step by step</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
