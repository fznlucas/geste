"use client";

/** Help's contact form (Help: email, order number, message, 320 px Send; MHelp: email, message, full-width Send). */
import { useState } from "react";
import { Button, Field, Input, Textarea } from "@/components";
import { contactSupport, validateContact, type ContactErrors } from "@/lib/client";
import { cn } from "@/lib/cn";

export function HelpContact({ variant, sent, onSent }: { variant: "desktop" | "phone"; sent: boolean; onSent: () => void }) {
  const desktop = variant === "desktop";
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const [sending, setSending] = useState(false);

  if (sent) {
    return (
      <p role="status" className={cn("m-0 bg-surface-muted", desktop ? "px-20 py-16" : "p-14")}>
        {desktop ? "Message sent. We reply within one working day, from hello@geste.studio." : "Sent. We reply within one working day."}
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = { email, orderNumber: desktop ? orderNumber : undefined, message };
    const found = validateContact(input);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    try {
      await contactSupport(input);
      onSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className={cn("flex flex-col", desktop ? "gap-14" : "gap-12")}>
      <Field label="Your email" error={errors.email}>
        <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {desktop && (
        <Field label="Order number — optional">
          <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="#GS-0000" />
        </Field>
      )}
      {/* pb-6: the boards' textarea is inline, so its line box leaves 6 px under it. */}
      <Field label="Message" error={errors.message} className="pb-6">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className={desktop ? "min-h-140" : "min-h-120"} />
      </Field>
      <Button type="submit" trailing="→" loading={sending} className={cn("w-full", desktop && "max-w-320")}>
        Send
      </Button>
    </form>
  );
}
