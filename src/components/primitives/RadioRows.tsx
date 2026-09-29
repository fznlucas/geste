"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface RadioRowOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Second Stone line under the label ("3–5 working days"). */
  sub?: ReactNode;
  /** Right column: a price ("$6") or a Stone note ("Visa · Mastercard · CB"). */
  aside?: ReactNode;
  asideMuted?: boolean;
  disabled?: boolean;
}

export interface RadioRowsProps<T extends string> {
  name: string;
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<RadioRowOption<T>>;
  /** Height inside the borders: 56 with a second line (delivery), 52 for one line (payment method). */
  rowHeight?: 52 | 56;
  /** phone = MCheckout: 22 px dot column, 12 px padding, 16 px line-height. */
  dense?: boolean;
}

/**
 * Stacked white rows sharing their borders (boards Checkout, MCheckout: delivery and payment
 * method). A 10 px ring shows the choice, filled Ink when selected; the selected row's border is
 * Ink. Native radios underneath: arrow keys move the choice, focus ring on the row.
 */
export function RadioRows<T extends string>({ name, label, value, onChange, options, rowHeight = 56, dense }: RadioRowsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "-mt-1 grid cursor-pointer items-center border bg-surface has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fg",
              dense ? "grid-cols-[22px_1fr_auto] px-12" : "grid-cols-[24px_1fr_auto] px-14",
              on ? "border-fg" : "border-border-field hover:bg-surface-hover",
              o.disabled && "cursor-not-allowed opacity-40 hover:bg-surface",
            )}
            // The boards' rows are content-box: 52 / 56 px inside the 1 px borders.
            style={{ minHeight: rowHeight + 2 }}
          >
            <input type="radio" name={name} value={o.value} checked={on} disabled={o.disabled} onChange={() => onChange(o.value)} className="sr-only" />
            <span aria-hidden="true" className={cn("size-10 rounded-full border border-fg", on ? "bg-fg" : "bg-transparent")} />
            {o.sub ? (
              <span className={cn("flex flex-col", dense ? "leading-[16px]" : "leading-[18px]")}>
                <span>{o.label}</span>
                <span className="text-fg-muted">{o.sub}</span>
              </span>
            ) : (
              <span>{o.label}</span>
            )}
            <span className={o.asideMuted ? "text-fg-muted" : undefined}>{o.aside}</span>
          </label>
        );
      })}
    </div>
  );
}
