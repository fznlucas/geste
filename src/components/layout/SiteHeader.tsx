import Link from "next/link";
import { Logo } from "../brand/Logo";
import { Icon } from "../brand/Icon";
import { cn } from "@/lib/cn";

export const MAIN_NAV = [
  { label: "Shop", href: "/shop" },
  { label: "Prints", href: "/prints" },
  { label: "Method", href: "/method" },
  { label: "Journal", href: "/journal" },
  { label: "About", href: "/about" },
] as const;

export interface SiteHeaderProps {
  /** Current section, underlined + aria-current. */
  active?: (typeof MAIN_NAV)[number]["label"];
  cartCount: number;
  signedIn: boolean;
  onCartClick: () => void;
}

/**
 * Desktop header (≥ 1200 px): no bottom rule. Logo left (animates and turns Stone on hover),
 * nav (links 24 px apart) sits 28 px from the icons on the right. Padding 8 × 32. Line height
 * normal (16 px links), as the desktop boards set none.
 */
export function SiteHeader({ active, cartCount, signedIn, onCartClick }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between px-32 py-8 leading-[normal]">
      <Link href="/" aria-label="geste.studio, home" className="flex min-h-44 items-center hover:text-fg-muted">
        <Logo size={12} tone="current" animateOnHover />
      </Link>
      <div className="flex items-center gap-28">
        <nav aria-label="Main" className="flex gap-24">
          {MAIN_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={n.label === active ? "page" : undefined}
              className={cn("hover:text-fg-muted", n.label === active && "underline underline-offset-4")}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center">
          <Link href={signedIn ? "/account" : "/login"} aria-label={signedIn ? "Account" : "Log in"} className="flex size-44 items-center justify-center hover:text-fg-muted">
            <Icon name="account" />
          </Link>
          <button type="button" onClick={onCartClick} aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`} className="flex min-h-44 min-w-44 items-center justify-center gap-5 hover:text-fg-muted">
            <Icon name="cart" />
            <span key={cartCount} aria-hidden="true" className="tabular-nums motion-safe:animate-[fade-in_150ms_var(--ease-standard)]">({cartCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
}
