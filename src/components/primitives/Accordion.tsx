"use client";

import * as RA from "@radix-ui/react-accordion";
import type { ReactNode } from "react";
import { Icon } from "../brand/Icon";

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

/** Rows of 44 px with a Line rule; plus → minus; panel height animates 240 ms (off under reduced motion). */
export function Accordion({ items, type = "single", defaultValue }: AccordionProps) {
  const body = items.map((it) => (
    <RA.Item key={it.value} value={it.value} className="border-b border-border">
      <RA.Header>
        <RA.Trigger className="group flex min-h-44 w-full items-center justify-between text-left hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg">
          {it.title}
          <span className="group-data-[state=open]:hidden">
            <Icon name="plus" />
          </span>
          <span className="hidden group-data-[state=open]:inline">
            <Icon name="minus" />
          </span>
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
