"use client";

/**
 * Top of checkout step 1. One sentence explains what express pay does (validated after user confusion):
 * "One tap: your wallet fills in contact, address and payment". Buttons are the real Stripe
 * Express Checkout Element (Apple Pay, Google Pay, PayPal) mounted in `children`; this component
 * only frames them and draws the "or fill in step by step" divider.
 */
export function ExpressPay({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="express-title" className="flex flex-col gap-12">
      <div className="flex flex-col">
        <span id="express-title">Express checkout</span>
        <span className="text-fg-muted">One tap: your wallet fills in contact, address and payment</span>
      </div>
      <div className="min-h-44">{children}</div>
      <div className="flex items-center gap-12 text-fg-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or fill in step by step
        <span className="h-px flex-1 bg-border" />
      </div>
    </section>
  );
}
