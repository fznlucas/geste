"use client";

import { useId, useState } from "react";
import { fieldClass } from "../primitives/Input";

/** Top bar search (300 × 36 px field, visually hidden label). Enter submits the query to `onSearch`. */
export function AdminSearch({ onSearch, defaultValue = "" }: { onSearch: (q: string) => void; defaultValue?: string }) {
  const id = useId();
  const [q, setQ] = useState(defaultValue);
  return (
    <form
      role="search"
      className="w-300 shrink-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) onSearch(q.trim());
      }}
    >
      <label htmlFor={id} className="sr-only">Search</label>
      <input id={id} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders, customers, works…" className={fieldClass().replace("min-h-44", "min-h-36")} />
    </form>
  );
}
