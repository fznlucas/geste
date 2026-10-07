"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { fieldClass } from "../primitives/Input";

export interface AdminSearchGroup {
  group: string;
  hits: Array<{ label: string; detail: string; href: string }>;
}

export interface AdminSearchProps {
  /** Results for a query (grouped); the page keeps only what the role can open. */
  search: (q: string) => Promise<AdminSearchGroup[]>;
  /** Enter: open the first result. */
  onOpen: (href: string) => void;
  defaultValue?: string;
}

/**
 * Top-bar search (AdminDashboard): results grouped under the field as you type; Enter opens the first,
 * Escape or a click outside closes them; "No result in what you can open" when nothing matches.
 */
export function AdminSearch({ search, onOpen, defaultValue = "" }: AdminSearchProps) {
  const id = useId();
  const [q, setQ] = useState(defaultValue);
  /** Results of the term they answer (a newer term hides older results); null = closed. */
  const [found, setFound] = useState<{ term: string; groups: AdminSearchGroup[] } | null>(null);
  const box = useRef<HTMLFormElement>(null);
  const term = q.trim();
  const groups = found && found.term === term && term.length >= 2 ? found.groups : null;

  useEffect(() => {
    if (term.length < 2) return;
    let live = true;
    const t = setTimeout(() => void search(term).then((g) => live && setFound({ term, groups: g })), 150);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [term, search]);

  useEffect(() => {
    if (!groups) return;
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setFound(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [groups]);

  // Enter before the results arrive searches at once.
  const openFirst = async () => {
    if (term.length < 2) return;
    const g = groups ?? (await search(term));
    const first = g[0]?.hits[0];
    if (first) {
      setFound(null);
      onOpen(first.href);
    } else setFound({ term, groups: g });
  };
  return (
    <form
      ref={box}
      role="search"
      className="relative w-300 shrink-0"
      onSubmit={(e) => {
        e.preventDefault();
        void openFirst();
      }}
      onKeyDown={(e) => e.key === "Escape" && setFound(null)}
    >
      <label htmlFor={id} className="sr-only">Search</label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search orders, customers, works…"
        aria-controls={groups ? `${id}-results` : undefined}
        autoComplete="off"
        className={fieldClass().replace("min-h-44", "min-h-36")}
      />
      {groups && (
        <div id={`${id}-results`} role="region" aria-label="Search results" className="absolute left-0 right-0 top-40 z-popover flex max-h-420 flex-col overflow-y-auto bg-surface py-8 shadow-pop">
          {groups.length === 0 ? (
            <p className="px-14 py-8 text-fg-muted">No result in what you can open.</p>
          ) : (
            groups.map((g) => (
              <div key={g.group} className="flex flex-col">
                <span className="px-14 pb-2 pt-6 text-fg-muted">{g.group}</span>
                {g.hits.map((h) => (
                  <Link
                    key={h.href + h.label}
                    href={h.href}
                    onClick={() => setFound(null)}
                    className="flex min-h-36 items-center justify-between gap-10 px-14 hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg"
                  >
                    <span className="truncate">{h.label}</span>
                    <span className="shrink-0 text-fg-muted">{h.detail}</span>
                  </Link>
                ))}
              </div>
            ))
          )}
          <span role="status" className="sr-only">{groups.reduce((n, g) => n + g.hits.length, 0)} results</span>
        </div>
      )}
    </form>
  );
}
