"use client";

/**
 * Help (≥ 1200 px: Help board, side topics + one topic at a time; below: MHelp, accordion + contact
 * form). The topic follows the URL hash (/help#shipping, #returns, #faq, #gift, #contact), from the
 * footer and other pages: on load, on hash changes and after in-app links to /help#… (Next's router
 * does not fire `hashchange`). Picking a topic replaces the hash (not a new history entry).
 */
import { useEffect, useRef, useState } from "react";
import { Accordion, ButtonLink, InfoSection, InfoSideNav } from "@/components";
import { HelpContact } from "./HelpContact";
import { HELP_PHONE, HELP_ROWS, HELP_TOPICS, type HelpTopic } from "./content";

const isTopic = (s: string): s is HelpTopic => HELP_TOPICS.some((t) => t.key === s);

export function HelpPage() {
  const [topic, setTopic] = useState<HelpTopic>("shipping");
  // Phone accordion: the open row ("" = all closed); MHelp opens Shipping.
  const [open, setOpen] = useState("shipping");
  const [sent, setSent] = useState(false);
  const phoneContact = useRef<HTMLHeadingElement>(null);
  const lastHash = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      if (hash === lastHash.current) return;
      lastHash.current = hash;
      if (!isTopic(hash)) return;
      setTopic(hash);
      if (hash === "contact") {
        if (phoneContact.current?.offsetParent) phoneContact.current.scrollIntoView({ block: "start" });
      } else setOpen(hash);
    };
    sync();
    // Next's router changes the URL with pushState, which fires no hashchange: the Navigation API
    // sees it; without that API, look again shortly after any click.
    const nav = (window as { navigation?: EventTarget }).navigation;
    const timers: number[] = [];
    const afterClick = () => [50, 300, 1000].forEach((ms) => timers.push(window.setTimeout(sync, ms)));
    nav?.addEventListener("currententrychange", sync);
    if (!nav) document.addEventListener("click", afterClick);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      nav?.removeEventListener("currententrychange", sync);
      document.removeEventListener("click", afterClick);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const pick = (key: string) => {
    if (!isTopic(key)) return;
    setTopic(key);
    lastHash.current = key;
    window.history.replaceState(window.history.state, "", `#${key}`);
  };

  const current = HELP_TOPICS.find((t) => t.key === topic)!;

  return (
    <>
      {/* Desktop — Help board: main 88 px 120 px, 12 columns, 40 px gutters. */}
      <div className="mx-auto hidden w-full max-w-1440 grid-cols-12 content-start gap-x-40 px-120 pt-88 lg:grid">
        <div className="col-span-3">
          <InfoSideNav eyebrow="Help" title="How can we help?" label="Help topics" items={HELP_TOPICS} current={topic} onPick={pick} />
        </div>
        <div className="col-span-7 col-start-5 flex flex-col gap-8 pt-72">
          {topic === "contact" ? (
            <InfoSection title="Contact">
              <HelpContact variant="desktop" sent={sent} onSent={() => setSent(true)} />
            </InfoSection>
          ) : (
            <InfoSection title={current.label} rows={HELP_ROWS[topic]}>
              {topic === "gift" && (
                <ButtonLink href="/gift-cards" trailing="from $15" className="mt-16 w-full max-w-320">
                  Buy a gift card
                </ButtonLink>
              )}
            </InfoSection>
          )}
        </div>
      </div>

      {/* Phone — MHelp: 24 px 16 px, 20 px between blocks. */}
      <div className="flex flex-col gap-20 px-16 pt-24 lg:hidden">
        <span className="text-fg-muted">Help</span>
        <h1 className="text-lg">How can we help?</h1>
        <Accordion variant="faq" value={open} onValueChange={setOpen} items={HELP_PHONE.map((q) => ({ value: q.key, title: q.title, content: <p className="m-0">{q.text}</p> }))} />
        <ButtonLink href="/gift-cards" variant="ghost">
          Buy a gift card
        </ButtonLink>
        <h2 ref={phoneContact} className="mt-12 scroll-mt-16 text-xs font-medium tracking-normal">
          Contact
        </h2>
        <HelpContact variant="phone" sent={sent} onSent={() => setSent(true)} />
      </div>
    </>
  );
}
