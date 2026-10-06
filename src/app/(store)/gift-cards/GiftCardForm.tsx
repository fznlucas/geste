"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, Field, GiftCardPreview, Input, Segmented, Textarea } from "@/components";
import { GIFT_CARD_PRESETS } from "@/lib/api";
import { addToCart } from "@/lib/client";
import { simToday } from "@/lib/clock";
import { formatPrice } from "@/lib/format";
import { duration } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface Design {
  key: string;
  number: string;
  imageUrl: string;
}

type Amount = `${(typeof GIFT_CARD_PRESETS)[number]}`;

/** GiftCard board: what one amount covers. */
function covers(cents: number): { long: string; short: string } {
  if (cents < 2000) return { long: "Covers one Beginner guide", short: "one Beginner guide" };
  if (cents < 4000) return { long: "Covers any guide", short: "any guide" };
  if (cents < 8000) return { long: "A guide and a print", short: "a guide and a print" };
  return { long: "Several guides and prints", short: "a guide and a print" };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GiftCardForm({ designs }: { designs: Design[] }) {
  const [amount, setAmount] = useState<number>(3000);
  const [design, setDesign] = useState(designs[0]?.key ?? "");
  const [toName, setToName] = useState("");
  const [fromName, setFromName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState<"now" | "date">("now");
  const [sendOn, setSendOn] = useState("2026-12-24");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const cover = designs.find((d) => d.key === design) ?? designs[0];
  const c = covers(amount);

  const add = () => {
    if (!EMAIL.test(email.trim())) {
      setError("Enter their email: the card is sent there.");
      emailRef.current?.focus();
      return;
    }
    setError(null);
    addToCart({ kind: "gift_card", amountCents: amount, recipientEmail: email.trim(), recipientName: toName.trim() || undefined, message: message.trim() || undefined, sendOn: when === "date" ? sendOn : undefined });
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), duration.addedLabel);
  };

  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-18 px-16 pt-8 lg:grid lg:grid-cols-12 lg:content-start lg:gap-x-40 lg:gap-y-0 lg:px-32 lg:pt-24">
      <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted lg:col-span-12 lg:mb-24">
        <Link href="/" className="hover:text-fg">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-fg">Gift card</span>
      </nav>
      <div className="lg:col-span-6">
        {cover && <GiftCardPreview imageUrl={cover.imageUrl} amountCents={amount} toName={toName} fromName={fromName} message={message} />}
      </div>
      <div className="flex flex-col gap-18 lg:col-span-5 lg:col-start-8 lg:gap-22">
        <h1 className="text-lg">Gift card</h1>
        <span className="hidden text-fg-muted lg:inline">Let someone paint their first canvas. They choose the work, the format and the palette.</span>
        <div className="flex flex-col gap-2 lg:gap-8">
          <span className="text-fg-muted">
            Amount<span className="lg:hidden"> · {c.short}</span>
          </span>
          <Segmented<Amount>
            label="Amount"
            gap="gap-x-16 lg:gap-x-20"
            value={`${amount}` as Amount}
            onChange={(v) => setAmount(Number(v))}
            options={GIFT_CARD_PRESETS.map((v) => ({ value: `${v}` as Amount, label: formatPrice(v) }))}
          />
          <span className="hidden text-fg-muted lg:inline">{c.long}</span>
        </div>
        <div className="flex flex-col gap-8">
          <span className="hidden text-fg-muted lg:inline">Card design</span>
          <div role="radiogroup" aria-label="Card design" className="flex gap-10">
            {designs.map((d) => (
              <button
                key={d.key}
                type="button"
                role="radio"
                aria-checked={d.key === design}
                aria-label={`Design ${d.number}`}
                onClick={() => setDesign(d.key)}
                className={cn("relative size-56 outline outline-1 outline-offset-3 lg:size-64", d.key === design ? "outline-fg" : "outline-transparent hover:outline-border-field")}
              >
                <Image src={d.imageUrl} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-18 lg:grid lg:grid-cols-2 lg:gap-14">
          <Field label="Their name"><Input value={toName} onChange={(e) => setToName(e.target.value)} autoComplete="off" /></Field>
          <Field label="Your name"><Input value={fromName} onChange={(e) => setFromName(e.target.value)} autoComplete="name" /></Field>
          <Field label="Their email" error={error ?? undefined} className="lg:col-span-2">
            <Input ref={emailRef} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="them@example.com" autoComplete="off" />
          </Field>
          <Field label="Message — optional" className="hidden lg:col-span-2 lg:block">
            {/* Inline as drawn: it sits on the text baseline, which leaves the board's 5.6 px under it. */}
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-88 lg:inline" rows={3} />
          </Field>
          <Field label="Message" className="lg:hidden">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-80" rows={3} />
          </Field>
        </div>
        <div className="flex flex-col gap-8">
          <span className="hidden text-fg-muted lg:inline">Send it</span>
          <Segmented<"now" | "date">
            label="Send it"
            gap="gap-x-16 lg:gap-x-20"
            value={when}
            onChange={setWhen}
            options={[{ value: "now", label: "Now" }, { value: "date", label: "On a date" }]}
          />
          {when === "date" && (
            <Field label="Date"><Input type="date" value={sendOn} min={simToday()} onChange={(e) => setSendOn(e.target.value)} /></Field>
          )}
        </div>
        <Button trailing={added ? "✓" : formatPrice(amount)} onClick={add} fullWidth>{added ? "Added" : "Add to cart"}</Button>
        <span className="hidden text-fg-muted lg:inline">Sent by email. Usable on guides and prints.</span>
      </div>
    </div>
  );
}
