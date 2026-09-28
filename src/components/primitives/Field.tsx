import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export interface FieldProps {
  label: string;
  /** Visually hide the label (it stays for screen readers). Use only when context makes it obvious. */
  hideLabel?: boolean;
  hint?: ReactNode;
  /** Error message: turns the control's border Signal and is announced. */
  error?: string;
  /** Exactly one control: Input, Select, Textarea, OtpInput, PasswordInput. */
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string; invalid?: boolean }>;
  className?: string;
}

/** Label (Stone, 6 px above) + control + hint or error (Signal) below. Wires ids and aria for you. */
export function Field({ label, hideLabel, hint, error, children, className }: FieldProps) {
  const auto = useId();
  const id = children.props.id ?? `f-${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id, invalid: !!error, "aria-invalid": !!error || undefined, "aria-describedby": describedBy })
    : children;
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-6 block text-fg-muted"}>
        {label}
      </label>
      {control}
      {error ? (
        <p id={errId} role="alert" className="mt-6 text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-6 text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
