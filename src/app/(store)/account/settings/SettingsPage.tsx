"use client";

/**
 * /account/settings (boards Settings 1440 × 1700, MSettings). Mock: every change stays on the page
 * (nothing is saved or sent), "Delete my account" logs out without deleting anything
 * (docs/mock-plan.md §3).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Input, passwordOk, useToast } from "@/components";
import { getAccountSecurity, getCustomer, type AccountSecurity, type CustomerDetail } from "@/lib/api";
import { signOut, whenSimReady } from "@/lib/client";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/dates";
import { AccountFrame } from "../_parts/AccountFrame";

export function SettingsPage() {
  return (
    <AccountFrame current="settings" phoneGap="gap-22">
      {({ phone, session }) => <Settings phone={phone} customerId={session.userId} firstName={session.firstName} />}
    </AccountFrame>
  );
}

interface Loaded {
  customer: CustomerDetail;
  security: AccountSecurity;
}

function Settings({ phone, customerId, firstName }: { phone: boolean; customerId: string; firstName: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  useEffect(() => {
    let live = true;
    void whenSimReady().then(() => Promise.all([getCustomer(customerId), getAccountSecurity(customerId)])).then(([customer, security]) => live && customer && security && setData({ customer, security }));
    return () => {
      live = false;
    };
  }, [customerId]);

  if (!data) {
    return (
      <div aria-busy="true" className="flex flex-col gap-22 lg:col-span-6 lg:col-start-4 lg:gap-36">
        <span className="sr-only">Loading your settings</span>
        <div className="h-160 bg-surface-muted" />
        <div className="h-120 bg-surface-muted" />
      </div>
    );
  }
  return <Form phone={phone} firstName={firstName} {...data} />;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function Form({ phone, firstName, customer, security }: Loaded & { phone: boolean; firstName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [first = "", ...rest] = customer.fullName.split(" ");

  // Profile
  const [fn, setFn] = useState(first);
  const [ln, setLn] = useState(rest.join(" "));
  const [email, setEmail] = useState(customer.email);
  const [saved, setSaved] = useState(false);
  const [profileErr, setProfileErr] = useState<{ fn?: string; ln?: string; email?: string }>({});
  const edit = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setSaved(false);
    setProfileErr({});
  };
  const saveProfile = () => {
    const e = {
      fn: phone || fn.trim() ? undefined : "Enter your first name",
      ln: phone || ln.trim() ? undefined : "Enter your last name",
      email: EMAIL.test(email.trim()) ? undefined : email.trim() ? "This email looks incomplete" : "Enter your email",
    };
    setProfileErr(e);
    if (!e.fn && !e.ln && !e.email) setSaved(true);
  };

  // Password
  const [pwOpen, setPwOpen] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pw, setPw] = useState({ cur: "", next: "", conf: "" });
  const [pwErr, setPwErr] = useState<{ cur?: string; next?: string; conf?: string }>({});
  const typePw = (k: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPw((p) => ({ ...p, [k]: e.target.value }));
    setPwErr((x) => ({ ...x, [k]: undefined }));
  };
  const savePw = () => {
    const e = {
      cur: pw.cur ? undefined : "Enter your current password",
      next: passwordOk(pw.next, email) ? undefined : "8 characters, a letter and a number",
      conf: phone || pw.conf === pw.next ? undefined : "The two passwords are different",
    };
    setPwErr(e);
    if (e.cur || e.next || e.conf) return;
    setPwOpen(false);
    setPwSaved(true);
    setPw({ cur: "", next: "", conf: "" });
  };
  const closePw = () => {
    setPwOpen(false);
    setPwErr({});
    setPw({ cur: "", next: "", conf: "" });
  };
  const pwInput = (id: string, label: string, k: keyof typeof pw) => (
    <Field label={label} error={pwErr[k]}>
      <Input id={id} type="password" autoComplete={k === "cur" ? "current-password" : "new-password"} value={pw[k]} onChange={typePw(k)} />
    </Field>
  );
  const pwStatus = pwSaved ? (phone ? "Updated just now" : "Password updated just now") : `Last changed ${shortDate(security.passwordChangedAt)}`;

  // Passkeys
  const [keys, setKeys] = useState(security.passkeys.map((k) => ({ id: k.id, name: phone ? `This ${k.device} · ${shortDate(k.addedAt)}` : `${k.device} of ${firstName} · added ${shortDate(k.addedAt)}` })));
  const addKey = () => {
    const mac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
    setKeys((k) => [...k, { id: `pk-${Date.now()}`, name: phone ? "This phone · today" : `${mac ? "This Mac" : "This computer"} · added today` }]);
  };

  // Preferences and data
  const [news, setNews] = useState(customer.newsletter);
  const [timer, setTimer] = useState(true);
  const [exported, setExported] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteAccount = () => {
    signOut();
    router.push("/");
    toast.show("Demo: nothing was deleted. You are logged out.");
  };

  const section = cn("flex flex-col border-t border-border", phone ? "gap-10 pt-16" : "gap-12 pt-24");
  const underline = "inline-flex min-h-32 items-center underline underline-offset-3 hover:text-fg-muted";
  const pwForgot = "/login?mode=forgot";

  const passkeyRows = keys.map((k) => (
    // Desktop rows: 44 px plus the bottom line, as drawn.
    <div key={k.id} className={cn("flex items-center justify-between", phone ? "min-h-44" : "min-h-45 border-b border-border")}>
      <span>{k.name}</span>
      <button type="button" onClick={() => setKeys((all) => all.filter((x) => x.id !== k.id))} className={underline} aria-label={`Remove ${k.name}`}>
        Remove
      </button>
    </div>
  ));

  const deleteBox = confirmDelete && (
    <div role="alert" className={cn("flex flex-col gap-10 border border-danger", phone ? "p-14" : "p-16")}>
      <span className="text-danger">{phone ? "This deletes your library for good." : "This deletes your library and guides for good. Orders stay in our books for legal reasons."}</span>
      {phone ? (
        <>
          <Button variant="danger-solid" trailing="→" onClick={deleteAccount}>Yes, delete</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button>
        </>
      ) : (
        <div className="flex gap-10">
          <Button variant="danger-solid" trailing="→" onClick={deleteAccount}>Yes, delete</Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep my account</Button>
        </div>
      )}
    </div>
  );

  if (phone) {
    return (
      <>
        <Field label="Email" error={profileErr.email}>
          <Input id="ms-mail" type="email" autoComplete="email" value={email} onChange={edit(setEmail)} />
        </Field>
        <Button variant="ghost" onClick={saveProfile}>{saved ? "Saved" : "Save email"}</Button>
        <section aria-labelledby="ms-pw-h" className={section}>
          <h2 id="ms-pw-h" className="text-xs font-medium tracking-normal">Password</h2>
          {pwOpen ? (
            <div className="flex flex-col gap-10">
              {pwInput("ms-cur", "Current", "cur")}
              {pwInput("ms-new", "New", "next")}
              <Button trailing="→" onClick={savePw}>Save password</Button>
              <Link href={pwForgot} className="self-start underline underline-offset-3 hover:text-fg-muted">Forgot it?</Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">{pwStatus}</span>
              <button type="button" onClick={() => setPwOpen(true)} className={underline} aria-label="Change password">Change</button>
            </div>
          )}
        </section>
        <section id="passkeys" aria-labelledby="ms-pk-h" className={section}>
          <h2 id="ms-pk-h" className="text-xs font-medium tracking-normal">Face ID &amp; passkeys</h2>
          {passkeyRows}
          <Button variant="ghost" onClick={addKey}>Add Face ID on this phone</Button>
        </section>
        <section aria-labelledby="ms-nt-h" className={section}>
          <h2 id="ms-nt-h" className="text-xs font-medium tracking-normal">Notifications</h2>
          <Checkbox layout="setting" gap="gap-12" label="Drying timer alerts" checked={timer} onChange={(e) => setTimer(e.target.checked)} />
          <Checkbox layout="setting" gap="gap-12" label="Letters from the studio" checked={news} onChange={(e) => setNews(e.target.checked)} />
        </section>
        <section aria-label="Your data" className={section}>
          <Button variant="ghost" onClick={() => setExported(true)}>{exported ? "Export sent by email" : "Download my data"}</Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete my account</Button>
          {deleteBox}
        </section>
      </>
    );
  }

  return (
    <div className="col-span-6 col-start-4 flex flex-col gap-36">
      <h2 className="text-xs font-medium tracking-normal">Settings</h2>
      <section aria-label="Profile" className="grid grid-cols-2 gap-14">
        <Field label="First name" error={profileErr.fn}>
          <Input id="st-fn" autoComplete="given-name" value={fn} onChange={edit(setFn)} />
        </Field>
        <Field label="Last name" error={profileErr.ln}>
          <Input id="st-ln" autoComplete="family-name" value={ln} onChange={edit(setLn)} />
        </Field>
        <Field label="Email — your login" error={profileErr.email} className="col-span-2">
          <Input id="st-mail" type="email" autoComplete="email" value={email} onChange={edit(setEmail)} />
        </Field>
        <div className="col-span-2 flex justify-end">
          <Button variant="ghost" onClick={saveProfile}>{saved ? "Saved" : "Save changes"}</Button>
        </div>
      </section>
      <section aria-labelledby="st-pw-h" className={section}>
        <h3 id="st-pw-h" className="text-xs font-medium tracking-normal">Password</h3>
        {pwOpen ? (
          <div className="flex flex-col gap-12">
            {pwInput("st-cur", "Current password", "cur")}
            {pwInput("st-new", "New password — 8 characters, a letter and a number", "next")}
            {pwInput("st-conf", "Confirm new password", "conf")}
            <div className="flex gap-10">
              <Button className="min-w-200" trailing="→" onClick={savePw}>Save password</Button>
              <Button variant="ghost" onClick={closePw}>Cancel</Button>
            </div>
            <Link href={pwForgot} className="self-start underline underline-offset-3 hover:text-fg-muted">Forgot your current password?</Link>
          </div>
        ) : (
          <div className="flex min-h-44 items-center justify-between">
            <span>{pwStatus}</span>
            <Button variant="ghost" onClick={() => setPwOpen(true)}>Change password</Button>
          </div>
        )}
      </section>
      <section id="passkeys" aria-labelledby="st-pk-h" className={section}>
        <h3 id="st-pk-h" className="text-xs font-medium tracking-normal">Passkeys</h3>
        <span className="text-fg-muted">Log in with Face ID or Touch ID instead of an email code.</span>
        {passkeyRows}
        <Button variant="ghost" onClick={addKey} className="self-start">Add a passkey on this device</Button>
      </section>
      <section aria-labelledby="st-pref-h" className={section}>
        <h3 id="st-pref-h" className="text-xs font-medium tracking-normal">Preferences</h3>
        <Checkbox layout="setting" gap="gap-12" label="Letters from the studio, twice a month" checked={news} onChange={(e) => setNews(e.target.checked)} />
        <Checkbox layout="setting" gap="gap-12" label="Drying-timer notifications on my phone" checked={timer} onChange={(e) => setTimer(e.target.checked)} />
      </section>
      <section aria-labelledby="st-data-h" className={section}>
        <h3 id="st-data-h" className="text-xs font-medium tracking-normal">Your data</h3>
        <div className="flex gap-10">
          <Button variant="ghost" onClick={() => setExported(true)}>{exported ? "Export sent by email" : "Download my data"}</Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete my account</Button>
        </div>
        {deleteBox}
      </section>
    </div>
  );
}
