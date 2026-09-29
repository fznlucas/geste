"use client";

/**
 * Legal (≥ 1200 px: Legal board, the five documents as links in the side column, one per page;
 * below: MLegal, the four text documents as an accordion — the page's own document open — then the
 * cookie settings). The consent is kept in this browser (`geste.cookies.v1`).
 */
import { useState } from "react";
import { Accordion, CookieSettings, InfoNote, InfoSection, InfoSideNav, type CookieChoice } from "@/components";
import type { LegalDocument, LegalKind } from "@/lib/api";
import { saveCookieConsent, useCookieConsent } from "@/lib/client";

export function LegalPage({ docs, current }: { docs: LegalDocument[]; current: LegalKind }) {
  const doc = docs.find((d) => d.kind === current)!;
  const stored = useCookieConsent();
  // Unsaved changes over the stored choice (read after hydration).
  const [draft, setDraft] = useState<CookieChoice | null>(null);
  const choice = draft ?? { audience: stored.audience, ads: stored.ads };
  const [saved, setSaved] = useState(false);
  const change = (next: CookieChoice) => {
    setDraft(next);
    setSaved(false);
  };
  const save = () => {
    saveCookieConsent(choice);
    setDraft(null);
    setSaved(true);
  };
  // MLegal opens the legal notice; a text document's own page opens that one.
  const [open, setOpen] = useState<string>(doc.summary ? current : "notice");

  return (
    <>
      {/* Desktop — Legal board: main 88 px 120 px, 12 columns, 40 px gutters. */}
      <div className="mx-auto hidden w-full max-w-1440 grid-cols-12 content-start gap-x-40 px-120 pt-88 lg:grid">
        <div className="col-span-3">
          <InfoSideNav
            eyebrow="Legal"
            title="The small print"
            label="Legal documents"
            items={docs.map((d) => ({ key: d.kind, label: d.title, href: `/legal/${d.kind}` }))}
            current={current}
          />
        </div>
        <div className="col-span-7 col-start-5 flex flex-col gap-8 pt-72">
          <InfoNote className="mb-16 px-14">Template — to be completed and checked with a lawyer before launch.</InfoNote>
          <InfoSection title={doc.title} rows={doc.sections.map((s) => ({ label: s.heading, text: s.text }))}>
            {current === "cookies" && <CookieSettings value={choice} onChange={change} saved={saved} onSave={save} />}
          </InfoSection>
        </div>
      </div>

      {/* Phone — MLegal: 24 px 16 px, 20 px between blocks. */}
      <div className="flex flex-col gap-20 px-16 pt-24 lg:hidden">
        <span className="text-fg-muted">Legal</span>
        <h1 className="text-lg">The small print</h1>
        <InfoNote className="px-12">Template — to check with a lawyer.</InfoNote>
        <Accordion
          variant="faq"
          value={open}
          onValueChange={setOpen}
          items={docs.flatMap((d) => (d.summary ? [{ value: d.kind, title: d.short, content: <p className="m-0">{d.summary}</p> }] : []))}
        />
        <h2 className="text-xs font-medium tracking-normal">Cookie settings</h2>
        <CookieSettings variant="phone" value={choice} onChange={change} saved={saved} onSave={save} />
      </div>
    </>
  );
}
