"use client";

import Link from "next/link";
import type { Orientation } from "@/lib/pricing";
import { Artwork } from "../commerce/Artwork";
import { Button } from "../primitives/Button";
import { PillButton } from "./AdminUI";

export interface KanbanCard {
  /** Stable key (a print copy id). */
  id: string;
  /** Underlined link text: the order number ("#GS-2041"). Defaults to `id`. */
  label?: string;
  title: string; // "N°07 · S · 12/100"
  subtitle: string; // "Camille Martin · Lyon"
  imageUrl: string;
  /** Of the work: a landscape thumbnail is turned (40 × 32). */
  orientation?: Orientation;
  href: string;
  /** A state line under the subtitle ("At the lab · back Oct 6"). */
  note?: string;
  /** One more action on the card ("Send to lab"), above the move buttons. */
  action?: { label: string; ariaLabel: string; onClick: () => void };
}

export interface KanbanColumn {
  key: string;
  title: string; // "To print"
  nextLabel?: string; // "Printed & signed"
  cards: KanbanCard[];
}

/**
 * Fulfilment board (AdminFulfilment): 4 columns on #F4F1ED (12 px padding, 560 px tall at least), white
 * cards. Moving is by buttons (34 px "←" pill and the Ink "Next step →"), not drag, so it works on a phone
 * and with a keyboard. `busy` disables a card while its move is saved.
 */
export function KanbanBoard({ columns, onMove, busy }: { columns: KanbanColumn[]; onMove: (cardId: string, toColumn: string) => void; busy?: string | null }) {
  return (
    <div className="grid grid-cols-4 items-start gap-16">
      {columns.map((c, ci) => (
        <section key={c.key} id={`col-${c.key}`} aria-label={`${c.title}, ${c.cards.length}`} className="flex min-h-584 scroll-mt-16 flex-col gap-10 bg-surface-hover p-12">
          <div className="flex justify-between">
            <h2 className="font-medium tracking-normal">{c.title}</h2>
            <span className="text-fg-muted" aria-hidden="true">{c.cards.length}</span>
          </div>
          {c.cards.map((k) => {
            const label = k.label ?? k.id;
            return (
              <article key={k.id} aria-label={`${label} · ${k.title}`} className="flex flex-col gap-8 border border-border bg-surface p-14">
                <div className="flex gap-10">
                  <Artwork src={k.imageUrl} orientation={k.orientation} className="w-40" sizes="40px" />
                  <span className="flex flex-col">
                    <Link href={k.href} className="self-start underline underline-offset-3 hover:text-fg-muted">{label}</Link>
                    <span>{k.title}</span>
                  </span>
                </div>
                <span className="text-fg-muted">{k.subtitle}</span>
                {k.note && <span>{k.note}</span>}
                {k.action && (
                  <PillButton className="self-start" aria-label={k.action.ariaLabel} disabled={busy === k.id} onClick={k.action.onClick}>
                    {k.action.label}
                  </PillButton>
                )}
                <div className="flex gap-6">
                  {ci > 0 && (
                    <PillButton aria-label={`Move ${label} back to ${columns[ci - 1]!.title}`} disabled={busy === k.id} onClick={() => onMove(k.id, columns[ci - 1]!.key)}>
                      ←
                    </PillButton>
                  )}
                  {ci < columns.length - 1 && (
                    <Button size="sm" trailing="→" className="flex-1" disabled={busy === k.id} aria-label={`Move ${label} to ${columns[ci + 1]!.title}`} onClick={() => onMove(k.id, columns[ci + 1]!.key)}>
                      {c.nextLabel ?? columns[ci + 1]!.title}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
