import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Small building blocks every admin board repeats (class names of the boards in brackets):
 * the white box [.box], table header and rows [.th / .row], the 32 px outline pill [.pillb],
 * the underlined tab row [.tab], the medium section title and the underlined text link.
 */

/** White box, Line border, 20 px padding, 14 px gap [.box]. `as="a"` + href for a linked tile. */
export function AdminBox({ children, className, style, as: As = "div", ...rest }: { children: ReactNode; className?: string; style?: CSSProperties; as?: ElementType; [k: string]: unknown }) {
  return (
    <As className={cn("flex flex-col gap-14 border border-border bg-surface p-20", className)} style={style} {...rest}>
      {children}
    </As>
  );
}

/** 36 px header row + its 1 px Ink rule (content-box like the boards: 37 px, and a `min-h-*` class is the board's value): Stone labels [.th]. `cols` is the CSS grid template of the board. */
export function AdminHeadRow({ cols, children, className }: { cols: string; children: ReactNode; className?: string }) {
  return (
    // Sticky: long tables keep their column names in view (docs/admin-v2/06 §5).
    <div role="row" className={cn("sticky top-0 z-[1] box-content grid min-h-36 items-center gap-x-12 border-b border-fg bg-surface text-fg-muted", className)} style={{ gridTemplateColumns: cols }}>
      {children}
    </div>
  );
}

/**
 * 44 px row + its 1 px Line rule (content-box like the boards: 45 px; a `min-h-*` class is the board's value) [.row]. With `href` the whole row is a link (hover Mist-light), as on the
 * dashboard; otherwise a plain row whose cells hold their own links and buttons.
 */
export function AdminRow({ cols, children, href, className, style, role = "row" }: { cols: string; children: ReactNode; href?: string; className?: string; style?: CSSProperties; role?: string }) {
  const cls = cn("box-content grid min-h-44 items-center gap-x-12 border-b border-border", href && "hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg", className);
  if (href) {
    return (
      <Link href={href} className={cls} style={{ gridTemplateColumns: cols, ...style }}>
        {children}
      </Link>
    );
  }
  return (
    <div role={role} className={cls} style={{ gridTemplateColumns: cols, ...style }}>
      {children}
    </div>
  );
}

export interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected filter / range: Ink border (aria-pressed). */
  pressed?: boolean;
  /** On the Ink selection bar: Paper text and border. */
  inverse?: boolean;
}

/** Outline pill, Line-field border, pressed = Ink border [.pillb]: 32 px + its 1 px borders (34 px, as the boards measure it). */
export const PillButton = forwardRef<HTMLButtonElement, PillButtonProps>(function PillButton({ pressed, inverse, className, type = "button", ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-34 cursor-pointer items-center border px-10 font-mono text-xs whitespace-nowrap",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:cursor-not-allowed disabled:opacity-40",
        inverse ? "border-fg-inverse text-fg-inverse hover:bg-action-hover" : pressed ? "border-fg" : "border-border-field hover:border-fg",
        className,
      )}
      {...rest}
    />
  );
});

/** Same look as PillButton, as a link. */
export function PillLink({ href, children, className, inverse }: { href: string; children: ReactNode; className?: string; inverse?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-34 items-center border px-10 whitespace-nowrap focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg",
        inverse ? "border-fg-inverse text-fg-inverse hover:bg-action-hover" : "border-border-field hover:border-fg",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * Underlined tab row [.tab]: 40 px Stone labels 20 px apart on a Line rule; the selected one is Ink
 * with a 2 px Ink underline. Buttons with aria-pressed, as drawn (filters, not ARIA tabpanels).
 */
export function AdminTabs<T extends string>({ tabs, value, onChange, label, className }: { tabs: readonly T[] | Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  const items = (tabs as Array<T | { value: T; label: string }>).map((t) => (typeof t === "string" ? { value: t, label: t } : t));
  return (
    <div role="group" aria-label={label} className={cn("flex gap-20 border-b border-border", className)}>
      {items.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex min-h-40 cursor-pointer items-center font-mono text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg",
              on ? "text-fg shadow-[inset_0_-2px_0_var(--color-fg)]" : "text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Box title: medium weight ("Latest orders", "To do today"). */
export function AdminTitle({ children, className, as: As = "h2" }: { children: ReactNode; className?: string; as?: ElementType }) {
  // tracking-normal: the global h1–h3 rule tightens headings; the boards' box titles are not tightened.
  return <As className={cn("text-xs font-medium tracking-normal", className)}>{children}</As>;
}

/** Underlined text link ("All orders", "Catalog"). */
export function UnderLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("underline underline-offset-3 hover:text-fg-muted", className)}>
      {children}
    </Link>
  );
}
