"use client";

import Link from "next/link";
import { useState } from "react";

const COLS = [
  { title: "Shop", links: [["All works", "/shop"], ["Prints", "/prints"], ["Shopping lists", "/method#materials"], ["Gift cards", "/gift-cards"]] },
  { title: "Help", links: [["How it works", "/method"], ["Shipping", "/help#shipping"], ["Returns & refunds", "/help#returns"], ["FAQ", "/help"], ["Contact", "/help#contact"]] },
  { title: "Studio", links: [["About", "/about"], ["Journal", "/journal"], ["Instagram", "https://www.instagram.com/"], ["TikTok", "https://www.tiktok.com/"]] },
  { title: "Legal", links: [["Legal notice", "/legal/notice"], ["Terms of sale", "/legal/terms"], ["Privacy policy", "/legal/privacy"], ["Cookie settings", "/legal/cookies"], ["Accessibility", "/legal/accessibility"]] },
] as const;

export interface SiteFooterProps {
  locale: "en" | "fr";
  onLocaleChange: (l: "en" | "fr") => void;
  /** Server action that adds the email to newsletter_subscribers (double opt-in). */
  subscribe: (email: string) => Promise<void>;
}

/** Desktop: 6-column grid, newsletter spans 2. Phone: stacked. Padding 56 32 28 (phone 64 16 24). */
export function SiteFooter({ locale, onLocaleChange, subscribe }: SiteFooterProps) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <footer className="flex flex-col gap-36 px-16 pb-24 pt-64 lg:gap-72 lg:px-32 lg:pb-28 lg:pt-56">
      <div className="grid grid-cols-2 gap-x-32 gap-y-32 lg:grid-cols-6">
        <div className="col-span-2 flex max-w-340 flex-col gap-10">
          <span>Letters from the studio. New works, new methods.</span>
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
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="mb-6 leading-[22px] text-fg-muted">{c.title}</div>
            {c.links.map(([l, h]) => (
              <Link key={l} href={h} className="block leading-[22px] hover:text-fg-muted">{l}</Link>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-fg-muted">
        <span>© {new Date().getFullYear()} Geste Studio — Lyon, France</span>
        <div className="flex items-center gap-14">
          <span>USD $</span>
          <span aria-hidden="true">·</span>
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
