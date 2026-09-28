"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "../primitives/Button";

export interface KanbanCard {
  id: string; // order number
  title: string; // "N°07 · A3 · 12/50"
  subtitle: string; // "Camille Martin · Lyon"
  imageUrl: string;
  href: string;
}

export interface KanbanColumn {
  key: string;
  title: string; // "To print"
  nextLabel?: string; // "Printed & signed"
  cards: KanbanCard[];
}

/**
 * Fulfilment board: 4 columns on #F4F1ED, white cards. Moving is by buttons (← and "Next step →"), not drag,
 * so it works on a phone and with a keyboard. onMove is a server action that updates print_copies.status.
 */
export function KanbanBoard({ columns, onMove }: { columns: KanbanColumn[]; onMove: (cardId: string, toColumn: string) => void }) {
  return (
    <div className="grid grid-cols-4 items-start gap-16">
      {columns.map((c, ci) => (
        <section key={c.key} aria-label={c.title} className="flex min-h-560 flex-col gap-10 bg-surface-hover p-12">
          <div className="flex justify-between">
            <span className="font-medium">{c.title}</span>
            <span className="text-fg-muted">{c.cards.length}</span>
          </div>
          {c.cards.map((k) => (
            <article key={k.id} className="flex flex-col gap-8 border border-border bg-surface p-14">
              <div className="flex gap-10">
                <span className="relative block h-50 w-40 shrink-0 bg-surface-muted">
                  <Image src={k.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                </span>
                <span className="flex flex-col">
                  <Link href={k.href} className="underline underline-offset-3">{k.id}</Link>
                  <span>{k.title}</span>
                </span>
              </div>
              <span className="text-fg-muted">{k.subtitle}</span>
              <div className="flex gap-6">
                {ci > 0 && (
                  <Button variant="ghost" size="sm" aria-label={`Move ${k.id} back to ${columns[ci - 1]!.title}`} onClick={() => onMove(k.id, columns[ci - 1]!.key)}>
                    ←
                  </Button>
                )}
                {ci < columns.length - 1 && (
                  <Button size="sm" trailing="→" className="flex-1" onClick={() => onMove(k.id, columns[ci + 1]!.key)}>
                    {c.nextLabel ?? columns[ci + 1]!.title}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
