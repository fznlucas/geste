"use client";

import * as RA from "@radix-ui/react-accordion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface AccordionItem {
  value: string;
  title: string;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** Product page: "single" so the Buy button stays above the fold. FAQ: "multiple". */
  type?: "single" | "multiple";
  defaultValue?: string[];
}

/** Rows of 48 px on phones, 44 px on desktop (MProduct / Product), with a Line rule; "+" → "−" (text, as drawn); panel height animates 240 ms (off under reduced motion). */
export function Accordion({ items, type = "single", defaultValue }: AccordionProps) {
  // Boards: each row is 44 px (48 on phones) borders included; a rule above every row but the first,
  // and under the last one (Product, MProduct).
  const body = items.map((it, i) => (
    <RA.Item key={it.value} value={it.value}>
      <RA.Header>
        <RA.Trigger className={cn("group flex min-h-48 w-full items-center justify-between border-border text-left lg:min-h-44", i > 0 && "border-t", i === items.length - 1 && "border-b", "hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg")} >
          {it.title}
          {/* Text signs, as drawn on the boards. */}
          <span aria-hidden="true" className="group-data-[state=open]:hidden">+</span>
          <span aria-hidden="true" className="hidden group-data-[state=open]:inline">−</span>
        </RA.Trigger>
      </RA.Header>
      <RA.Content className="overflow-hidden pb-16 text-fg-muted data-[state=closed]:animate-[collapse_240ms_var(--ease-standard)] data-[state=open]:animate-[expand_240ms_var(--ease-standard)]">
        {it.content}
      </RA.Content>
    </RA.Item>
  ));
  return type === "single" ? (
    <RA.Root type="single" collapsible defaultValue={defaultValue?.[0]} className="border-t border-border">
      {body}
    </RA.Root>
  ) : (
    <RA.Root type="multiple" defaultValue={defaultValue} className="border-t border-border">
      {body}
    </RA.Root>
  );
}
