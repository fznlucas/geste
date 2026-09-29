"use client";

import { Button } from "../primitives/Button";
import { Checkbox } from "../primitives/Checkbox";
import { cn } from "@/lib/cn";

export interface CookieChoice {
  audience: boolean;
  ads: boolean;
}

export interface CookieSettingsProps {
  value: CookieChoice;
  onChange: (next: CookieChoice) => void;
  /** Shows "Saved" on the button until the next change. */
  saved: boolean;
  onSave: () => void;
  /** desktop = Legal (56 px ruled rows, 320 px button); phone = MLegal (44 px rows 20 px apart, full-width button). */
  variant?: "desktop" | "phone";
}

const LABELS = {
  desktop: { essential: "Essential · cart, login", audience: "Audience measurement", ads: "Social media and ads" },
  phone: { essential: "Essential", audience: "Audience", ads: "Ads" },
};

/**
 * "Cookie settings" (Legal, MLegal): essential cookies always on, audience and ads as checkboxes,
 * "Save my choices →" then "Saved". The page keeps the choice (`saveCookieConsent`).
 */
export function CookieSettings({ value, onChange, saved, onSave, variant = "desktop" }: CookieSettingsProps) {
  const t = LABELS[variant];
  const desktop = variant === "desktop";
  // The board's rows are 56 px plus their rules (content-box): 57 px, the last one 58 px.
  const row = desktop ? "min-h-57 border-t border-border" : "min-h-44";
  return (
    <div className={cn("flex flex-col", !desktop && "gap-20")}>
      <div className={cn("flex items-center justify-between", row)}>
        <span>{t.essential}</span>
        <span className="text-fg-muted">Always on</span>
      </div>
      <Checkbox layout="end" className={row} label={t.audience} checked={value.audience} onChange={(e) => onChange({ ...value, audience: e.target.checked })} />
      <Checkbox layout="end" className={cn(desktop ? "min-h-58 border-y border-border" : row)} label={t.ads} checked={value.ads} onChange={(e) => onChange({ ...value, ads: e.target.checked })} />
      <Button trailing="→" onClick={onSave} aria-live="polite" className={cn("w-full", desktop && "mt-16 max-w-320")}>
        {saved ? "Saved" : "Save my choices"}
      </Button>
    </div>
  );
}
