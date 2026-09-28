"use client";

import { useMemo, useRef } from "react";

/**
 * Drawer and Modal are opened from state, not a Radix Trigger, so Radix has nowhere to send focus
 * on close. Spread these on <Dialog.Content>: focus goes back to what had it when the dialog opened.
 */
export function useReturnFocus() {
  const returnTo = useRef<HTMLElement | null>(null);
  return useMemo(
    () => ({
      onOpenAutoFocus: () => {
        returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      },
      onCloseAutoFocus: (e: Event) => {
        if (returnTo.current?.isConnected) {
          e.preventDefault();
          returnTo.current.focus();
        }
      },
    }),
    [],
  );
}
