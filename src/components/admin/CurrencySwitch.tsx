"use client";

import { cn } from "@/lib/cn";

export type CurrencyChoice = "eur" | "usd";

export const CURRENCY_LABEL: Record<CurrencyChoice, string> = { eur: "EUR excl. VAT", usd: "USD charged" };

/**
 * Top-bar money display (docs/admin-v2/02, 06 §1): "EUR excl. VAT" (the books) or "USD charged" (what the
 * customer paid). A native select styled as the 34 px outline pill of the top bar.
 */
export function CurrencySwitch({ value, onChange, disabled, className }: { value: CurrencyChoice; onChange: (v: CurrencyChoice) => void; disabled?: boolean; className?: string }) {
  return (
    <label className={cn("inline-flex items-center", className)}>
      <span className="sr-only">Money shown in</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as CurrencyChoice)}
        className={cn(
          "min-h-34 cursor-pointer border border-border-field bg-surface px-10 font-mono text-xs hover:border-fg",
          "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        {(Object.keys(CURRENCY_LABEL) as CurrencyChoice[]).map((c) => (
          <option key={c} value={c}>{CURRENCY_LABEL[c]}</option>
        ))}
      </select>
    </label>
  );
}
