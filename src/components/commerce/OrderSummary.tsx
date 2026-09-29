"use client";

import { useId, useState } from "react";
import { Artwork } from "./Artwork";
import { Button } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Orientation } from "@/lib/pricing";

/** "$95", or "$95" struck and "$80.75" for a bundled line. */
function LinePrice({ line }: { line: OrderSummaryLine }) {
  if (!line.issue && line.discountCents) {
    return (
      <span className="flex gap-8 whitespace-nowrap tabular-nums">
        <s className="text-fg-muted" aria-label={`was ${formatPrice(line.priceCents)}`}>{formatPrice(line.priceCents)}</s>
        <span>{formatPrice(line.priceCents - line.discountCents)}</span>
      </span>
    );
  }
  return <span className={cn("tabular-nums", line.issue && "text-fg-muted line-through")}>{formatPrice(line.priceCents)}</span>;
}

export interface OrderSummaryLine {
  id: string;
  title: string; // "N°03 — Guide"
  /** "60×80 · Intermediate", "S · Edition 12/100" */
  detail: string;
  /** "+ shopping list" */
  note?: string | null;
  /** "N°03 — Guide, 60×80" (phone summary) */
  receiptTitle: string;
  imageUrl?: string;
  orientation?: Orientation;
  priceCents: number;
  /** Bundle discount on the line; the price shows struck with the discounted one. */
  discountCents?: number;
  /** "−15% with the print" */
  bundleNote?: string | null;
  /** Sold out or unavailable: not counted, Signal text. */
  issue?: string | null;
}

export interface OrderSummaryTotals {
  subtotalCents: number;
  /** Guide + print bundles: "Guide + print −15%" under the subtotal. */
  discountCents?: number;
  discountLabel?: string;
  /** null = no carrier chosen yet → "Next step". undefined = nothing to ship. */
  shippingCents: number | null | undefined;
  totalCents: number;
  /** "Including VAT $10.67" (hidden when 0 or unknown). */
  vatCents?: number;
}

const shippingText = (c: OrderSummaryTotals["shippingCents"]) => (c === undefined ? "Digital, no shipping" : c === null ? "Next step" : formatPrice(c));

export interface OrderSummaryProps {
  lines: OrderSummaryLine[];
  totals: OrderSummaryTotals;
  /** Mock: every code is refused. Later: the promotion / gift card lookup. Resolves false when invalid. */
  onApplyCode: (code: string) => Promise<boolean>;
}

/**
 * Checkout right column (board Checkout): Mist-warm panel, lines with 56×70 thumbs, gift card or
 * promo code, totals with the included VAT, four reassurance lines. Hidden on the confirmation.
 */
export function OrderSummary({ lines, totals, onApplyCode }: OrderSummaryProps) {
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = useId();
  return (
    <aside aria-label="Order summary" className="flex flex-col gap-16 bg-surface-hover p-24">
      <span className="text-fg-muted">Order summary</span>
      {lines.map((l) => (
        <div key={l.id} className="flex gap-14">
          {l.imageUrl ? (
            <Artwork src={l.imageUrl} orientation={l.orientation} className="w-56" sizes="56px" imgClassName={l.issue ? "opacity-40" : undefined} />
          ) : (
            <span className="block h-70 w-56 shrink-0 bg-surface-muted" />
          )}
          <div className="flex flex-1 justify-between gap-12">
            <span>
              {l.title}
              <br />
              <span className="text-fg-muted">
                {l.detail}
                {l.note && (
                  <>
                    <br />
                    {l.note}
                  </>
                )}
              </span>
              {!l.issue && !!l.discountCents && l.bundleNote && (
                <>
                  <br />
                  {l.bundleNote}
                </>
              )}
              {l.issue && (
                <>
                  <br />
                  <span className="text-danger">{l.issue}</span>
                </>
              )}
            </span>
            <LinePrice line={l} />
          </div>
        </div>
      ))}
      <form
        className="flex items-end gap-8"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!code.trim() || busy) return;
          setBusy(true);
          setInvalid(!(await onApplyCode(code.trim())));
          setBusy(false);
        }}
      >
        <div className="flex-1">
          <label htmlFor={`${id}-code`} className="mb-6 block text-fg-muted">Gift card or promo code</label>
          <Input
            id={`${id}-code`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setInvalid(false);
            }}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-code-err` : undefined}
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="ghost" aria-busy={busy || undefined}>
          {invalid ? "Invalid code" : "Apply"}
        </Button>
        {invalid && <span id={`${id}-code-err`} role="status" className="sr-only">This code is not valid.</span>}
      </form>
      <div className="flex flex-col gap-8 border-t border-border pt-14">
        <div className="flex justify-between"><span className="text-fg-muted">Subtotal</span><span className="tabular-nums">{formatPrice(totals.subtotalCents)}</span></div>
        {!!totals.discountCents && (
          <div className="flex justify-between"><span className="text-fg-muted">{totals.discountLabel ?? "Discount"}</span><span className="tabular-nums">−{formatPrice(totals.discountCents)}</span></div>
        )}
        <div className="flex justify-between"><span className="text-fg-muted">Shipping</span><span className="tabular-nums">{shippingText(totals.shippingCents)}</span></div>
        <div className="flex justify-between border-t border-border pt-8 font-medium"><span>Total</span><span className="tabular-nums">{formatPrice(totals.totalCents)}</span></div>
        {!!totals.vatCents && <span className="text-fg-muted">Including VAT {formatPrice(totals.vatCents)}</span>}
      </div>
      <div className="flex flex-col gap-4 border-t border-border pt-14 text-fg-muted">
        <span>Secure payment · 3D Secure</span>
        <span>Guides unlock instantly</span>
        <span>Free returns on prints within 14 days</span>
        <span>Questions? hello@geste.studio</span>
      </div>
    </aside>
  );
}

/** Phone (board MCheckout): "Show order summary   $64" opens the receipt lines and the shipping. */
export function OrderSummaryToggle({ lines, totals }: Pick<OrderSummaryProps, "lines" | "totals">) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="bg-surface-hover">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-48 w-full items-center justify-between px-14 hover:text-fg-muted">
        <span>{open ? "Hide order summary" : "Show order summary"}</span>
        <span className="tabular-nums">{formatPrice(totals.totalCents)}</span>
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-6 px-14 pb-14">
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between gap-12">
              <span>
                {l.receiptTitle}
                {l.issue && <span className="text-danger"> · {l.issue}</span>}
              </span>
              <LinePrice line={l} />
            </div>
          ))}
          {!!totals.discountCents && (
            <div className="flex justify-between text-fg-muted"><span>{totals.discountLabel ?? "Discount"}</span><span className="tabular-nums">−{formatPrice(totals.discountCents)}</span></div>
          )}
          <div className="flex justify-between text-fg-muted"><span>Shipping</span><span className="tabular-nums">{shippingText(totals.shippingCents)}</span></div>
        </div>
      )}
    </div>
  );
}
