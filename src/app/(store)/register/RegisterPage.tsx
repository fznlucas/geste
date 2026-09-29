"use client";

/**
 * /register (boards Register, MRegister). Mock: "Create my account" signs in with the fake session
 * (a mock customer's email as them, any other as Camille), as the login does; nothing is created.
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Input, OrDivider, PasswordField, PasswordRules, passwordOk, passwordRules } from "@/components";
import { safeNext, signIn, useHydrated, useSession, type SignInMethod } from "@/lib/client";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/useMediaQuery";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function RegisterPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const desktop = useMediaQuery("(min-width: 1200px)");

  useEffect(() => {
    if (session.status === "signed_in") router.replace(next);
  }, [session.status, router, next]);

  if (!hydrated) return <div aria-busy="true" className="min-h-480" />;
  return <Form phone={!desktop} loginHref={params.get("next") ? `/login?next=${encodeURIComponent(next)}` : "/login"} />;
}

function Form({ phone, loginHref }: { phone: boolean; loginHref: string }) {
  const [v, setV] = useState({ fn: "", ln: "", email: "", pw: "" });
  const [terms, setTerms] = useState(false);
  const [news, setNews] = useState(false);
  const [err, setErr] = useState<{ fn?: string; ln?: string; email?: string }>({});
  const [busy, setBusy] = useState<SignInMethod | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    setErr((x) => ({ ...x, [k]: undefined }));
  };
  const canCreate = passwordOk(v.pw, v.email) && terms;

  const create = async () => {
    const e = {
      fn: v.fn.trim() ? undefined : "Enter your first name",
      ln: phone || v.ln.trim() ? undefined : "Enter your last name",
      email: EMAIL.test(v.email.trim()) ? undefined : v.email.trim() ? "This email looks incomplete" : "Enter your email",
    };
    setErr(e);
    if (e.fn || e.ln || e.email) {
      setTimeout(() => document.querySelector<HTMLElement>('main [aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setBusy("password");
    await signIn({ method: "password", email: v.email });
  };
  const passkey = async () => {
    setBusy("passkey");
    await signIn({ method: "passkey" });
  };

  const field = (k: "fn" | "ln" | "email", id: string, label: string, props: React.ComponentProps<typeof Input>, className?: string) => (
    <Field label={label} error={err[k]} className={className}>
      <Input id={id} value={v[k]} onChange={set(k)} {...props} />
    </Field>
  );
  const password = (id: string) => <PasswordField id={id} label="Password" autoComplete="new-password" value={v.pw} onChange={set("pw")} />;
  const rules = <PasswordRules rules={passwordRules(v.pw, v.email)} className={phone ? undefined : "gap-2"} />;
  const termsLink = (label: string, href: string) => <Link href={href} className="underline underline-offset-3 hover:text-fg-muted">{label}</Link>;
  const createButton = (
    <Button trailing="→" onClick={() => void create()} disabled={!canCreate || busy !== null} loading={busy === "password"}>
      Create my account
    </Button>
  );
  const loginLine = (text: string) => (
    <span>
      {text} <Link href={loginHref} className="underline underline-offset-3 hover:text-fg-muted">Log in</Link>
    </span>
  );

  if (phone) {
    return (
      <div className="flex flex-col gap-16 px-16 pt-32">
        <h1 className="text-lg font-medium">Create your account</h1>
        {field("fn", "mr-fn", "First name", { autoComplete: "given-name" })}
        {field("email", "mr-mail", "Email", { type: "email", autoComplete: "email" })}
        {password("mr-pw")}
        {rules}
        <Checkbox layout="inline" label={<>I accept the {termsLink("terms", "/legal/terms")}.</>} checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        {createButton}
        <Button variant="ghost" onClick={() => void passkey()} disabled={busy !== null}>Continue with Face ID</Button>
        {loginLine("Already have one?")}
      </div>
    );
  }

  return (
    <div className="flex justify-center pt-96">
      <div className="flex w-440 flex-col gap-20">
        <h1 className="text-lg font-medium">Create your account</h1>
        <span className="text-fg-muted">Your guides, shopping lists and orders in one place.</span>
        <div className="grid grid-cols-2 gap-14">
          {field("fn", "rg-fn", "First name", { autoComplete: "given-name" })}
          {field("ln", "rg-ln", "Last name", { autoComplete: "family-name" })}
          {field("email", "rg-mail", "Email", { type: "email", autoComplete: "email", placeholder: "you@example.com" }, "col-span-2")}
          <div className="col-span-2">{password("rg-pw")}</div>
        </div>
        {rules}
        <Checkbox layout="inline" label={<>I accept the {termsLink("terms", "/legal/terms")} and the {termsLink("privacy policy", "/legal/privacy")}.</>} checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        <Checkbox layout="inline" className={cn("text-fg-muted")} label="Send me new works and methods, twice a month." checked={news} onChange={(e) => setNews(e.target.checked)} />
        {createButton}
        <OrDivider />
        <Button variant="ghost" onClick={() => void passkey()} disabled={busy !== null}>Continue with a passkey</Button>
        {loginLine("Already have an account?")}
      </div>
    </div>
  );
}
