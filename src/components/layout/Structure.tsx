import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Max 1200 px content column, 16 px phone gutter, 32 px desktop padding. */
export function Container({ children, className, as: As = "div" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <As className={cn("mx-auto w-full max-w-1264 px-16 lg:px-32", className)}>{children}</As>;
}

/** Vertical rhythm between page sections: 48 phone, 72 desktop. */
export function Section({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={cn("py-48 lg:py-72", className)}>
      {children}
    </section>
  );
}

/** Page title: 28 px (phone 22 px), weight 500, tracking -2%, optional Stone lead on the right (desktop). */
export function PageTitle({ title, lead, eyebrow }: { title: string; lead?: string; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-8">
        {eyebrow && <span className="text-fg-muted">{eyebrow}</span>}
        <h1 className="text-md lg:text-lg">{title}</h1>
      </div>
      {lead && <p className="max-w-460 text-fg-muted lg:text-right">{lead}</p>}
    </div>
  );
}

/** 12-column desktop grid, 8 on tablet, 1 on phone. Children set their own col-span. */
export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-24 md:grid-cols-8 lg:grid-cols-12", className)}>{children}</div>;
}
