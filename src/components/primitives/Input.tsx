import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** White field, 1 px #D8D3CC border, 44 px, 12 px padding. Focus: Ink border. Error: Signal border. */
export const fieldClass = (invalid?: boolean, disabled?: boolean) =>
  cn(
    "block w-full min-h-44 bg-surface px-12 font-mono text-xs text-fg border outline-none",
    "placeholder:text-fg-muted transition-colors duration-150",
    invalid ? "border-danger" : "border-border-field focus:border-fg",
    disabled && "bg-surface-muted text-fg-muted cursor-not-allowed",
  );

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ invalid, className, disabled, ...rest }, ref) {
  return <input ref={ref} disabled={disabled} className={cn(fieldClass(invalid, disabled), className)} {...rest} />;
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, disabled, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} disabled={disabled} className={cn(fieldClass(invalid, disabled), "py-12 leading-xs", className)} {...rest} />;
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}
/** Native select for accessibility and mobile pickers; custom chevron drawn with the icon grid. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ invalid, className, disabled, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select ref={ref} disabled={disabled} className={cn(fieldClass(invalid, disabled), "appearance-none pr-32", className)} {...rest}>
        {children}
      </select>
      <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={1.1}>
        <path d="M2.5 4.5L6 8L9.5 4.5" />
      </svg>
    </div>
  );
});
