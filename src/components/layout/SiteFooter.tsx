"use client";

import Link from "next/link";
import { useState } from "react";

const COLS = [
  { title: "Shop", links: [["All works", "/shop"], ["Prints", "/prints"], ["Shopping lists", "/method#materials"], ["Gift cards", "/gift-cards"]] },
  { title: "Help", links: [["How it works", "/method"], ["Shipping", "/help#shipping"], ["Returns & refunds", "/help#returns"], ["FAQ", "/help"], ["Contact", "/help#contact"]] },
  { title: "Studio", links: [["About", "/about"], ["Journal", "/journal"], ["Instagram", "https://www.instagram.com/"], ["TikTok", "https://www.tiktok.com/"]] },
  { title: "Legal", links: [["Legal notice", "/legal/notice"], ["Terms of sale", "/legal/terms"], ["Privacy policy", "/legal/privacy"], ["Cookie settings", "/legal/cookies"], ["Accessibility", "/legal/accessibility"]] },
] as const;

/** Phone (< 768 px, board MHome): three links per column, merged labels. */
const PHONE_COLS = [
  { title: "Shop", links: [["All works", "/shop"], ["Prints", "/prints"], ["Gift cards", "/gift-cards"]] },
  { title: "Help", links: [["How it works", "/method"], ["Shipping & returns", "/help#shipping"], ["FAQ & contact", "/help"]] },
  { title: "Studio", links: [["About", "/about"], ["Journal", "/journal"], ["Instagram", "https://www.instagram.com/"]] },
  { title: "Legal", links: [["Legal notice", "/legal/notice"], ["Terms & privacy", "/legal/terms"], ["Cookies", "/legal/cookies"]] },
] as const;

function Column({ title, links, className }: { title: string; links: ReadonlyArray<readonly [string, string]>; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-6 leading-[22px] text-fg-muted">{title}</div>
      {links.map(([l, h]) => (
        // 24 px rows (board: 22 px): WCAG 2.2 target size.
        <Link key={l} href={h} className="block leading-[24px] hover:text-fg-muted">{l}</Link>
      ))}
    </div>
  );
}

export interface SiteFooterProps {
  locale: "en" | "fr";
  onLocaleChange: (l: "en" | "fr") => void;
  /** Server action that adds the email to newsletter_subscribers (double opt-in). */
  subscribe: (email: string) => Promise<void>;
}

/**
 * Desktop: 6-column grid, newsletter spans 2. Phone (< 768 px): newsletter, 2×2 short columns,
 * "© 2026 Geste Studio" and "USD $ EN FR" (board MHome). Padding 56 32 28 (phone 64 16 24).
 */
export function SiteFooter({ locale, onLocaleChange, subscribe }: SiteFooterProps) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <footer className="flex flex-col gap-36 px-16 pb-24 pt-64 lg:gap-72 lg:px-32 lg:pb-28 lg:pt-56">
      <div className="grid grid-cols-2 gap-x-32 gap-y-24 md:gap-y-32 lg:grid-cols-6">
        <div className="col-span-2 mb-12 flex max-w-340 flex-col gap-10 md:mb-0">
          <span>Letters from the studio.<span className="hidden md:inline"> New works, new methods.</span></span>
          {done ? (
            <span className="flex min-h-44 items-center text-fg-muted">Thank you. The first letter lands next month.</span>
          ) : (
            <form
              className="flex items-end gap-16"
              onSubmit={async (e) => {
                e.preventDefault();
                await subscribe(email);
                setDone(true);
              }}
            >
              <label htmlFor="news-email" className="sr-only">Email address</label>
              <input id="news-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full border-b border-border-field bg-transparent py-10 outline-none placeholder:text-fg-muted focus:border-fg" />
              <button type="submit" className="min-h-44 hover:text-fg-muted">Subscribe</button>
            </form>
          )}
        </div>
        {COLS.map((c) => <Column key={c.title} title={c.title} links={c.links} className="hidden md:block" />)}
        {PHONE_COLS.map((c) => <Column key={c.title} title={c.title} links={c.links} className="md:hidden" />)}
      </div>
      <div className="flex items-center justify-between text-fg-muted">
        <span>© {new Date().getFullYear()} Geste Studio<span className="hidden md:inline"> — Lyon, France</span></span>
        <div className="flex items-center gap-12 md:gap-14">
          <span>USD $</span>
          <span aria-hidden="true" className="hidden md:inline">·</span>
          {(["en", "fr"] as const).map((l) => (
            <button key={l} type="button" aria-pressed={locale === l} onClick={() => onLocaleChange(l)} className={locale === l ? "text-fg underline underline-offset-4" : "text-fg"}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
}
