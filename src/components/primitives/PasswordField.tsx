"use client";

import { forwardRef, useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Input, type InputProps } from "./Input";

export interface PasswordFieldProps extends Omit<InputProps, "type" | "id"> {
  id?: string;
  label: string;
  error?: string;
  className?: string;
}

/**
 * Password with "Show" / "Hide" in text at the end of the label row (boards Login, Register,
 * MLogin, MRegister). The text button stretches to the label row (26 px), so its word sits 3 px
 * lower than the label, as drawn.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField({ id, label, error, className, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? `pw-${auto}`;
  const errId = error ? `${inputId}-err` : undefined;
  const [visible, setVisible] = useState(false);
  return (
    <div className={className}>
      <div className="flex justify-between">
        <label htmlFor={inputId} className="mb-6 block text-fg-muted">{label}</label>
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="inline-flex min-h-20 items-center text-fg-muted hover:text-fg"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <Input ref={ref} id={inputId} type={visible ? "text" : "password"} invalid={!!error} aria-invalid={!!error || undefined} aria-describedby={errId} {...rest} />
      {error && (
        <p id={errId} role="alert" className="mt-6 text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

export interface PasswordRule {
  label: string;
  ok: boolean;
}

/** The boards' three rules; "Not your email" also compares with the email when one is typed. */
export function passwordRules(pw: string, email = ""): PasswordRule[] {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "A letter and a number", ok: /[A-Za-z]/.test(pw) && /[0-9]/.test(pw) },
    { label: "Not your email", ok: pw.length > 0 && !pw.includes("@") && (!local || !pw.toLowerCase().includes(local)) },
  ];
}

export const passwordOk = (pw: string, email = "") => passwordRules(pw, email).every((r) => r.ok);

/** "· At least 8 characters" in Stone, "✓ …" in Ink once met. Announced politely as they change. */
export function PasswordRules({ rules, className }: { rules: PasswordRule[]; className?: string }) {
  return (
    <ul aria-live="polite" aria-label="Password rules" className={cn("m-0 flex list-none flex-col p-0", className)}>
      {rules.map((r) => (
        <li key={r.label} className={r.ok ? "text-fg" : "text-fg-muted"}>
          <span aria-hidden="true">{r.ok ? "✓" : "·"}</span> {r.label}
          <span className="sr-only">{r.ok ? ", done" : ", not yet"}</span>
        </li>
      ))}
    </ul>
  );
}

/** "—— or ——" between the main action and the other ways in (Login, Register). */
export function OrDivider() {
  return (
    <div className="flex items-center gap-12 text-fg-muted">
      <span aria-hidden="true" className="h-1 flex-1 bg-border" />
      <span>or</span>
      <span aria-hidden="true" className="h-1 flex-1 bg-border" />
    </div>
  );
}
