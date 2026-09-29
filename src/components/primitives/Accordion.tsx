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
  /** Controlled single accordion ("" = all closed): the URL opens a row (/help#faq, /legal/terms). */
  value?: string;
  onValueChange?: (value: string) => void;
  /**
   * product (Product, MProduct): 44 / 48 px rows rules included, 16 px under an open panel.
   * faq (MMethod, MHelp, MLegal): 48 px rows plus their rule, 12 px under an open panel.
   */
  variant?: "product" | "faq";
}

/** Line rule on top and under every row; "+" → "−" (text, as drawn); panel height animates 240 ms (off under reduced motion). */
export function Accordion({ items, type = "single", defaultValue, value, onValueChange, variant = "product" }: AccordionProps) {
  const faq = variant === "faq";
  const body = items.map((it, i) => (
    <RA.Item key={it.value} value={it.value} className={cn(faq && "border-b border-border")}>
      {/* RA.Header is an h3: the boards draw the row labels at the body weight, without heading tracking. */}
      <RA.Header className="m-0 font-normal tracking-normal">
        <RA.Trigger
          className={cn(
            "group flex min-h-48 w-full cursor-pointer items-center justify-between text-left",
            // Product boards: each row is 44 px (48 on phones) borders included.
            !faq && "border-border lg:min-h-44",
            !faq && i > 0 && "border-t",
            !faq && i === items.length - 1 && "border-b",
            "hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg",
          )}
        >
          <span>{it.title}</span>
          <span aria-hidden="true" className="group-data-[state=open]:hidden">+</span>
          <span aria-hidden="true" className="hidden group-data-[state=open]:inline">−</span>
        </RA.Trigger>
      </RA.Header>
      <RA.Content className="overflow-hidden text-fg-muted data-[state=closed]:animate-[collapse_240ms_var(--ease-standard)] data-[state=open]:animate-[expand_240ms_var(--ease-standard)]">
        <div className={faq ? "pb-12" : "pb-16"}>{it.content}</div>
      </RA.Content>
    </RA.Item>
  ));
  if (type === "multiple") {
    return (
      <RA.Root type="multiple" defaultValue={defaultValue} className="border-t border-border">
        {body}
      </RA.Root>
    );
  }
  const state = value !== undefined ? { value, onValueChange } : { defaultValue: defaultValue?.[0] };
  return (
    <RA.Root type="single" collapsible {...state} className="border-t border-border">
      {body}
    </RA.Root>
  );
}
