"use client";

import Link from "next/link";
import { Logo } from "../brand/Logo";
import { Drawer } from "../overlay/Drawer";
import { MAIN_NAV } from "./SiteHeader";
import { cn } from "@/lib/cn";

export interface MobileMenuProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  signedIn: boolean;
  locale?: "en" | "fr";
  onLocaleChange?: (l: "en" | "fr") => void;
}

/**
 * Full-screen menu (board MMenu): logo + "Close", 28 px links (-0.02 em), then Log in / My library / Gift cards /
 * Help (44 px rows, the board draws 36: docs/decisions.md "Phone menu targets"), and "USD $ · EN FR"
 * pinned at the bottom (32 px EN / FR as in the footer, each touched on a 44 × 44 area).
 */
export function MobileMenu({ open, onOpenChange, signedIn, locale = "en", onLocaleChange }: MobileMenuProps) {
  const close = () => onOpenChange(false);
  const secondary = [
    ...(signedIn ? [] : [{ label: "Log in", href: "/login" }]),
    { label: "My library", href: "/account" },
    { label: "Gift cards", href: "/gift-cards" },
    { label: "Help", href: "/help" },
  ];
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Menu"
      side="full"
      header={
        <Link href="/" onClick={close} aria-label="geste.studio, home" className="flex min-h-44 items-center">
          <Logo size={12} />
        </Link>
      }
    >
      <nav aria-label="Main" className="flex flex-col px-16 pt-40">
        {MAIN_NAV.map((n) => (
          <Link key={n.href} href={n.href} onClick={close} className="text-lg leading-[1.5] tracking-heading hover:text-fg-muted">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-4 px-16 pt-32">
        {secondary.map((n) => (
          <Link key={n.href} href={n.href} onClick={close} className="flex min-h-44 items-center hover:text-fg-muted">{n.label}</Link>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-border p-16 text-fg-muted">
        <span>USD $</span>
        <div className="flex gap-12">
          {(["en", "fr"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={locale === l}
              onClick={() => onLocaleChange?.(l)}
              // Drawn 32 px tall (MMenu), touched on an invisible 44 × 44 area: EN's reaches left, FR's to the
              // screen's edge (past the row's 16 px padding). They share 1.6 px, left to EN (on top), so all of
              // "EN" stays EN: two 44 px areas need 88 px, the labels and the edge leave 86.4.
              className={cn(
                "relative inline-flex min-h-32 items-center text-fg underline-offset-4 before:absolute before:top-1/2 before:h-44 before:w-44 before:-translate-y-1/2 before:content-['']",
                locale === l && "underline",
                l === "en" ? "z-10 before:right-0" : "before:-right-16",
              )}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
