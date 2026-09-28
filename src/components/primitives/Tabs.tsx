"use client";

import * as RT from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  /** "underline" (store, admin) draws a 2 px Ink bar under the active tab over a 1 px Line rule. */
  className?: string;
  label: string;
}

export function Tabs({ items, value, defaultValue, onValueChange, className, label }: TabsProps) {
  return (
    <RT.Root value={value} defaultValue={defaultValue ?? items[0]?.value} onValueChange={onValueChange} className={className}>
      <RT.List aria-label={label} className="flex gap-20 border-b border-border">
        {items.map((t) => (
          <RT.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              "inline-flex min-h-40 items-center gap-6 text-fg-muted transition-colors duration-150 hover:text-fg",
              "data-[state=active]:text-fg data-[state=active]:shadow-[inset_0_-2px_0_var(--color-fg)]",
              "focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg focus-visible:outline-offset-2",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="text-fg-muted">{t.count}</span>}
          </RT.Trigger>
        ))}
      </RT.List>
      {items.map((t) => (
        <RT.Content key={t.value} value={t.value} className="pt-20 outline-none">
          {t.content}
        </RT.Content>
      ))}
    </RT.Root>
  );
}
