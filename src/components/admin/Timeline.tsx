"use client";

import { useState } from "react";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";

export interface TimelineEvent {
  at: string; // "Oct 1, 14:02"
  text: string;
  kind?: "system" | "note";
}

/** Order timeline: 120 px time (Stone) + event, 36 px rows; an internal note input at the bottom (never sent to the customer). */
export function Timeline({ events, onAddNote }: { events: TimelineEvent[]; onAddNote: (text: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-col">
      <ol>
        {events.map((e, i) => (
          <li key={i} className="grid min-h-36 grid-cols-[120px_1fr] items-center border-b border-border">
            <span className="text-fg-muted">{e.at}</span>
            <span>{e.kind === "note" ? <span className="bg-surface-muted px-6">Note · {e.text}</span> : e.text}</span>
          </li>
        ))}
      </ol>
      <form
        className="mt-12 flex gap-10"
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!note.trim()) return;
          await onAddNote(note.trim());
          setNote("");
        }}
      >
        <label htmlFor="order-note" className="sr-only">Internal note</label>
        <Input id="order-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" />
        <Button type="submit" variant="ghost">Add</Button>
      </form>
    </div>
  );
}
