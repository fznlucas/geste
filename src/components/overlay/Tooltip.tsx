"use client";

import * as T from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

/** Ink box, Paper text, 3×8 padding, no arrow. Charts and icon-only controls. Delay 200 ms. */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <T.Provider delayDuration={200}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content sideOffset={6} className="z-popover whitespace-nowrap bg-fg px-8 py-3 text-xs text-fg-inverse">
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
