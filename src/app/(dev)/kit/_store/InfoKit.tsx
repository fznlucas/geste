"use client";

/** /kit · Help and Legal parts (Help, MHelp, Legal, MLegal): side topics, topic rows, note, phone accordion, cookie settings. */
import { useState } from "react";
import { Accordion, Checkbox, CookieSettings, InfoNote, InfoSection, InfoSideNav, type CookieChoice } from "@/components";

const TOPICS = [
  { key: "shipping", label: "Shipping" },
  { key: "returns", label: "Returns" },
  { key: "contact", label: "Contact" },
];

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <span className="text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

export function InfoKit() {
  const [topic, setTopic] = useState("shipping");
  const [open, setOpen] = useState("a");
  const [choice, setChoice] = useState<CookieChoice>({ audience: true, ads: false });
  const [saved, setSaved] = useState(false);
  const [end, setEnd] = useState(true);
  return (
    <div className="grid grid-cols-3 gap-40">
      <State label="Side topics · buttons, the current one pressed (Help)">
        <InfoSideNav eyebrow="Help" title="How can we help?" label="Kit help topics" items={TOPICS} current={topic} onPick={setTopic} />
      </State>
      <State label="Side topics · links, current page (Legal)">
        <InfoSideNav eyebrow="Legal" title="The small print" label="Kit legal documents" items={[{ key: "notice", label: "Legal notice", href: "#" }, { key: "terms", label: "Terms of sale", href: "#" }]} current="terms" />
      </State>
      <div className="flex flex-col gap-8">
        <State label="Note (Legal) + topic rows (Help, Legal)">
          <InfoNote className="mb-16 px-14">Template — to be completed and checked with a lawyer before launch.</InfoNote>
          <InfoSection title="Shipping" rows={[{ label: "Guides", text: "Digital: they unlock in your library the second you pay." }, { label: "Packaging", text: "Rolled in a rigid tube, wrapped in acid-free paper." }]} />
        </State>
      </div>
      <State label="Phone topics · one open (MHelp, MLegal)">
        <Accordion variant="faq" value={open} onValueChange={setOpen} items={[{ value: "a", title: "Shipping", content: <p className="m-0">Guides unlock instantly.</p> }, { value: "b", title: "Returns", content: <p className="m-0">Prints: 14 days to change your mind.</p> }]} />
      </State>
      <State label="Cookie settings · desktop, then “Saved” (Legal)">
        <CookieSettings value={choice} onChange={(c) => { setChoice(c); setSaved(false); }} saved={saved} onSave={() => setSaved(true)} />
      </State>
      <State label="Cookie settings · phone (MLegal) · checkbox, box at the end">
        <CookieSettings variant="phone" value={choice} onChange={(c) => { setChoice(c); setSaved(false); }} saved={saved} onSave={() => setSaved(true)} />
        <Checkbox layout="end" className="min-h-44" label="Checkbox · end layout" checked={end} onChange={(e) => setEnd(e.target.checked)} />
        <Checkbox layout="end" className="min-h-44" label="Disabled" disabled />
      </State>
    </div>
  );
}
