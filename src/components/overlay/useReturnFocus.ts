"use client";

import { useRef } from "react";

/**
 * Drawer and Modal are opened from state, not a Radix Trigger, so Radix has nowhere to send focus
 * on close. Spread these on <Dialog.Content>: focus goes back to what had it when the dialog opened,
 * or to `focusOnClose()` when it returns an element (e.g. the first field with an error).
 */
export function useReturnFocus(focusOnClose?: () => HTMLElement | null | undefined) {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (e: Event) => {
      const target = focusOnClose?.() ?? (returnTo.current?.isConnected ? returnTo.current : null);
      if (target) {
        e.preventDefault();
        target.focus();
      }
    },
  };
}
