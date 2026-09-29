import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Parts of the Help and Legal pages (boards Help, Legal; phone MHelp, MLegal): the desktop side
 * column (eyebrow, 28 px title, topics) and the rows of a topic (label, Stone text, Line rule above).
 */

export interface InfoNavItem {
  key: string;
  label: string;
  /** Legal: each document is a page. Without href the item is a button (Help's topics). */
  href?: string;
}

export interface InfoSideNavProps {
  /** "Help", "Legal" (Stone, above the title). */
  eyebrow: string;
  /** Page h1: "How can we help?", "The small print". */
  title: string;
  /** Accessible name of the list of topics: "Help topics", "Legal documents". */
  label: string;
  items: InfoNavItem[];
  current: string;
  onPick?: (key: string) => void;
}

/**
 * Desktop side column (3 of 12 columns): eyebrow + title 16 px above the topics, 32 px topic rows
 * 4 px apart; the current one underlined (offset 4), the others in Stone. Links get
 * `aria-current="page"`, buttons `aria-pressed`, as drawn.
 */
export function InfoSideNav({ eyebrow, title, label, items, current, onPick }: InfoSideNavProps) {
  const row = (on: boolean) =>
    cn("inline-flex min-h-32 items-center justify-start text-left", on ? "underline underline-offset-4" : "text-fg-muted hover:text-fg");
  const list = items.map((it) =>
    it.href ? (
      <Link key={it.key} href={it.href} aria-current={it.key === current ? "page" : undefined} className={row(it.key === current)}>
        {it.label}
      </Link>
    ) : (
      <button key={it.key} type="button" aria-pressed={it.key === current} onClick={() => onPick?.(it.key)} className={cn(row(it.key === current), "cursor-pointer")}>
        {it.label}
      </button>
    ),
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-16 flex flex-col gap-8">
        <span className="text-fg-muted">{eyebrow}</span>
        <h1 className="text-lg">{title}</h1>
      </div>
      {items.some((it) => it.href) ? (
        <nav aria-label={label} className="flex flex-col gap-4">
          {list}
        </nav>
      ) : (
        <div role="group" aria-label={label} className="flex flex-col gap-4">
          {list}
        </div>
      )}
    </div>
  );
}

export interface InfoSectionProps {
  title: string;
  /** Label + Stone text, one row each, 14 px above and below, Line rule on top. */
  rows?: Array<{ label: string; text: ReactNode }>;
  /** After the rows (Help's "Buy a gift card", the contact form, cookie rows). */
  children?: ReactNode;
  className?: string;
}

/** A topic of Help or a Legal document: title (500, 12 px above the rows), then the rows. */
export function InfoSection({ title, rows = [], children, className }: InfoSectionProps) {
  return (
    <section aria-label={title} className={cn("flex flex-col", className)}>
      <h2 className="mb-12 text-xs font-medium tracking-normal">{title}</h2>
      {rows.length > 0 && (
        <dl className="m-0 flex flex-col">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-4 border-t border-border py-14">
              <dt>{r.label}</dt>
              <dd className="m-0 text-fg-muted">{r.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

/** Mist note above a Legal document: "Template — to be completed and checked with a lawyer before launch." */
export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("m-0 bg-surface-muted py-10", className)}>{children}</p>;
}
