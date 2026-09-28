"use client";

import Link from "next/link";
import { Logo } from "../brand/Logo";
import { Drawer } from "../overlay/Drawer";
import { MAIN_NAV } from "./SiteHeader";

export interface MobileMenuProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  signedIn: boolean;
  locale?: "en" | "fr";
  onLocaleChange?: (l: "en" | "fr") => void;
}

/**
 * Full-screen menu (board MMenu): logo + "Close", 28 px links, then Log in / My library / Gift cards /
 * Help, and "USD $ · EN FR" pinned at the bottom.
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
          <Link key={n.href} href={n.href} onClick={close} className="text-lg leading-[1.5] hover:text-fg-muted">
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
            <button key={l} type="button" aria-pressed={locale === l} onClick={() => onLocaleChange?.(l)} className={locale === l ? "min-h-44 text-fg underline underline-offset-4" : "min-h-44 text-fg"}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}
