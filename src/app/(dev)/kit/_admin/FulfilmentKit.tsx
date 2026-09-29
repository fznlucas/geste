"use client";

/** /kit · Admin — fulfilment board (AdminFulfilment): default, a card being saved (busy), empty columns. */
import { useState } from "react";
import { KanbanBoard, type KanbanColumn } from "@/components";
import { asset } from "@/lib/asset";

const card = (id: string, order: string, title: string, who: string, n: number) => ({
  id, label: order, title, subtitle: who, imageUrl: asset(`mock/work-${String(n).padStart(2, "0")}.jpg`), href: "#",
});

const START: Record<string, string> = { a: "to_print", b: "to_print", c: "printed", d: "shipped" };
const CARDS = [
  card("a", "#GS-2041", "N°07 · A3 · 10/50", "Camille Martin · Lyon", 7),
  card("b", "#GS-2036", "N°07 · A3 · 11/50", "Sarah Cohen · Paris", 7),
  card("c", "#GS-2038", "N°01 · A2 · 9/30", "Inès Moreau · Nantes", 1),
  card("d", "#GS-2033", "N°08 · 50×70 · 21/25", "Jules Fabre · Lille", 8),
];
const STEPS = [["to_print", "To print"], ["printed", "Printed & signed"], ["packed", "Packed"], ["shipped", "Shipped"]] as const;

function columns(pos: Record<string, string>): KanbanColumn[] {
  return STEPS.map(([key, title], i) => ({ key, title, nextLabel: STEPS[i + 1]?.[1], cards: CARDS.filter((c) => pos[c.id] === key) }));
}

export function FulfilmentKit() {
  const [pos, setPos] = useState(START);
  return (
    <div className="flex flex-col gap-24">
      <p className="text-fg-muted">KanbanBoard · interactive (← / next move the card)</p>
      <KanbanBoard columns={columns(pos)} onMove={(id, to) => setPos((p) => ({ ...p, [id]: to }))} />
      <p className="text-fg-muted">KanbanBoard · busy (the first card is being saved)</p>
      <KanbanBoard columns={columns(START)} onMove={() => {}} busy="a" />
      <p className="text-fg-muted">KanbanBoard · empty</p>
      <KanbanBoard columns={columns({})} onMove={() => {}} />
    </div>
  );
}
