"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "../brand/Logo";
import { Icon } from "../brand/Icon";
import { MobileMenu } from "./MobileMenu";

export interface MobileHeaderProps {
  cartCount: number;
  signedIn: boolean;
  onCartClick: () => void;
  locale?: "en" | "fr";
  onLocaleChange?: (l: "en" | "fr") => void;
}

/** Phone header (< 1200 px): logo left, account, cart (n), "Menu" text button. Padding 4 4 4 16. Hover: Stone on the icons and "Menu"; the logo stays Ink (boards MHome, MShop). */
export function MobileHeader({ cartCount, signedIn, onCartClick, locale, onLocaleChange }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  return (
    <header className="flex items-center justify-between py-4 pl-16 pr-4">
      <Link href="/" aria-label="geste.studio, home" className="flex min-h-44 items-center">
        <Logo size={12} />
      </Link>
      <div className="flex items-center">
        <Link href={signedIn ? "/account" : "/login"} aria-label={signedIn ? "Account" : "Log in"} className="flex size-44 items-center justify-center hover:text-fg-muted">
          <Icon name="account" />
        </Link>
        <button type="button" onClick={onCartClick} aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`} className="flex min-h-44 min-w-44 items-center justify-center gap-5 hover:text-fg-muted">
          <Icon name="cart" />
          <span key={cartCount} aria-hidden="true" className="tabular-nums motion-safe:animate-[fade-in_150ms_var(--ease-standard)]">({cartCount})</span>
        </button>
        <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className="flex min-h-44 min-w-68 items-center justify-center px-12 hover:text-fg-muted">
          Menu
        </button>
      </div>
      <MobileMenu open={open} onOpenChange={setOpen} signedIn={signedIn} locale={locale} onLocaleChange={onLocaleChange} />
    </header>
  );
}
