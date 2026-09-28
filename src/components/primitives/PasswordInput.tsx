"use client";

import { forwardRef, useState } from "react";
import { Input, type InputProps } from "./Input";
import { Icon } from "../brand/Icon";

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /** Show the 4-segment strength meter under the field (register, reset). */
  showStrength?: boolean;
}

export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 16) s++;
  return s as 0 | 1 | 2 | 3 | 4;
}

const WORDS = ["Too short", "Weak", "Fair", "Good", "Strong"];

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { showStrength, value, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const score = passwordScore(String(value ?? ""));
  return (
    <div>
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} value={value} className="pr-44" autoComplete="current-password" {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex size-44 items-center justify-center text-fg-muted hover:text-fg"
        >
          <Icon name="show" />
        </button>
      </div>
      {showStrength && (
        <div className="mt-8 flex items-center gap-8" aria-live="polite">
          <div className="flex flex-1 gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < score ? "h-2 flex-1 bg-fg" : "h-2 flex-1 bg-border"} />
            ))}
          </div>
          <span className="text-fg-muted">{WORDS[score]}</span>
        </div>
      )}
    </div>
  );
});
