"use client";

/**
 * /login (boards Login: password, code, forgot, sent, reset; MLogin). Mock sign-in (docs/mock-plan.md
 * "What the fakes do"): nothing is checked, a mock customer's email signs in as them, anything else
 * and the passkey as Camille; any 6 digits pass. `?next=` is honoured (same-site paths only),
 * `?mode=forgot` opens the reset flow (Settings › "Forgot your current password?").
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Checkbox, Field, Input, OrDivider, PasswordField, PasswordRules, passwordOk, passwordRules } from "@/components";
import { isSixDigitCode, safeNext, signIn, useHydrated, useSession, type SignInMethod } from "@/lib/client";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/useMediaQuery";

type Mode = "password" | "code" | "forgot" | "sent" | "reset";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginPage() {
  const hydrated = useHydrated();
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const desktop = useMediaQuery("(min-width: 1200px)");

  // Signed in (already, or just now): go on to `next`.
  useEffect(() => {
    if (session.status === "signed_in") router.replace(next);
  }, [session.status, router, next]);

  if (!hydrated) return <div aria-busy="true" className="min-h-480" />;
  return <Form phone={!desktop} initialMode={params.get("mode") === "forgot" ? "forgot" : "password"} />;
}

function Form({ phone, initialMode }: { phone: boolean; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState<{ email?: string; pw?: string; code?: string }>({});
  const [busy, setBusy] = useState<SignInMethod | "send" | null>(null);

  const go = (m: Mode) => {
    setMode(m);
    setErr({});
    setPw("");
    if (m === "code") {
      setCodeSent(false);
      setCode("");
    }
  };
  const checkEmail = () => {
    const e = EMAIL.test(email.trim()) ? undefined : email.trim() ? "This email looks incomplete" : "Enter your email";
    setErr((x) => ({ ...x, email: e }));
    return !e;
  };
  const login = async (method: SignInMethod) => {
    setBusy(method);
    await signIn({ method, email }); // the page moves on to `next` once the session is set
  };

  const submitPassword = () => {
    const okEmail = checkEmail();
    const pwErr = pw ? undefined : "Enter your password";
    setErr((x) => ({ ...x, pw: pwErr }));
    if (okEmail && !pwErr) void login("password");
  };
  const sendCode = async () => {
    if (!checkEmail()) return;
    setBusy("send");
    await new Promise((r) => setTimeout(r, 400));
    setBusy(null);
    setCodeSent(true);
  };
  const submitCode = (value = code) => {
    if (!isSixDigitCode(value)) {
      setErr((x) => ({ ...x, code: "Enter the 6 digits of the code" }));
      return;
    }
    void login("email_code");
  };
  const sendReset = () => {
    if (checkEmail()) go("sent");
  };

  const emailField = (id: string) => (
    <Field label="Email" error={err.email}>
      <Input
        id={id}
        type="email"
        autoComplete="email"
        placeholder={phone ? undefined : "you@example.com"}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErr((x) => ({ ...x, email: undefined }));
        }}
      />
    </Field>
  );
  const passwordField = (id: string, label: string, autoComplete: string) => (
    <PasswordField
      id={id}
      label={label}
      autoComplete={autoComplete}
      value={pw}
      error={err.pw}
      onChange={(e) => {
        setPw(e.target.value);
        setErr((x) => ({ ...x, pw: undefined }));
      }}
    />
  );
  const textButton = (label: string, onClick: () => void, className?: string) => (
    <button type="button" onClick={onClick} className={cn("inline-flex min-h-32 items-center text-left underline underline-offset-3 hover:text-fg-muted", className)}>
      {label}
    </button>
  );
  const primary = (label: string, onClick: () => void, loading = false, disabled = false) => (
    <Button trailing="→" onClick={onClick} loading={loading} disabled={disabled || loading}>
      {label}
    </Button>
  );
  const codeField = (
    <Field label="6-digit code" error={err.code}>
      <Input
        id={phone ? "ml-code" : "lg-code"}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={phone ? undefined : "123 456"}
        maxLength={7}
        className="text-code tracking-code"
        value={code}
        onChange={(e) => {
          const v = e.target.value.replace(/[^\d ]/g, "");
          setCode(v);
          setErr((x) => ({ ...x, code: undefined }));
          // Auto-submit once the six digits are in (docs/screens/account.md).
          if (isSixDigitCode(v.replace(/\s/g, ""))) submitCode(v.replace(/\s/g, ""));
        }}
      />
    </Field>
  );
  const rules = passwordRules(pw, email);
  const canReset = passwordOk(pw, email);
  const note = cn("bg-surface-muted", phone ? "p-14" : "px-16 py-14");

  let body: React.ReactNode;
  if (mode === "password") {
    body = phone ? (
      <>
        {emailField("ml-mail")}
        {passwordField("ml-pw", "Password", "current-password")}
        {textButton("Forgot password?", () => go("forgot"), "self-end")}
        {primary("Log in", submitPassword, busy === "password")}
        <Button variant="ghost" onClick={() => void login("passkey")} disabled={busy !== null}>Use Face ID</Button>
        <Button variant="ghost" onClick={() => go("code")}>Email me a login code</Button>
      </>
    ) : (
      <>
        {emailField("lg-mail")}
        {passwordField("lg-pw", "Password", "current-password")}
        <div className="flex items-center justify-between">
          <Checkbox layout="setting" gap="gap-10" label="Keep me logged in" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          {textButton("Forgot password?", () => go("forgot"))}
        </div>
        {primary("Log in", submitPassword, busy === "password")}
        <OrDivider />
        <Button variant="ghost" onClick={() => void login("passkey")} disabled={busy !== null}>Use a passkey (Face ID, Touch ID)</Button>
        <Button variant="ghost" onClick={() => go("code")}>Email me a login code</Button>
      </>
    );
  } else if (mode === "code") {
    body = (
      <>
        {!phone && <span className="text-fg-muted">Enter your email, we send you a 6-digit code. It expires in 10 minutes.</span>}
        {emailField(phone ? "ml-mail2" : "lg-mail2")}
        {codeSent && codeField}
        {codeSent ? <div className={phone ? "mt-14 flex flex-col" : "flex flex-col"}>{primary("Log in", () => submitCode(), busy === "email_code")}</div> : primary("Send me a code", () => void sendCode(), busy === "send")}
        {codeSent && <span role="status" className="sr-only">We sent a code to {email}.</span>}
        {textButton(phone ? "Use my password" : "Use my password instead", () => go("password"), phone ? undefined : "self-start")}
      </>
    );
  } else if (mode === "forgot") {
    body = (
      <>
        <span className="text-fg-muted">{phone ? "We send you a link to choose a new password." : "Enter your email. We send you a link to choose a new password."}</span>
        {emailField(phone ? "ml-mail3" : "lg-mail3")}
        {primary("Send reset link", sendReset)}
        {textButton("Back to log in", () => go("password"), phone ? undefined : "self-start")}
      </>
    );
  } else if (mode === "sent") {
    body = (
      <>
        <span role="status" className={note}>
          {phone ? "Check your inbox. The link works for 30 minutes." : "Check your inbox. If an account exists for this email, a reset link is on its way. It works for 30 minutes."}
        </span>
        <Button variant="ghost" onClick={() => go("reset")}>Open the link (demo)</Button>
        {!phone && textButton("Back to log in", () => go("password"), "self-start")}
      </>
    );
  } else {
    body = (
      <>
        {!phone && <span className="font-medium">Choose a new password</span>}
        {passwordField(phone ? "ml-new" : "lg-new", "New password", "new-password")}
        <PasswordRules rules={rules} className={phone ? undefined : "gap-2"} />
        {phone ? canReset && primary("Save and log in", () => void login("password"), busy === "password") : primary("Save and log in", () => void login("password"), busy === "password", !canReset)}
      </>
    );
  }

  return (
    <div className={phone ? "flex flex-col gap-18 px-16 pt-32" : "flex justify-center pt-96"}>
      <div className={phone ? "contents" : "flex w-400 flex-col gap-20"}>
        <h1 className="text-lg font-medium">Log in</h1>
        <div className={cn("flex flex-col", phone ? "gap-14" : "gap-16")}>{body}</div>
        {phone ? (
          <span className={note}>
            No account? <Link href="/register" className="underline underline-offset-3 hover:text-fg-muted">Create one</Link>
          </span>
        ) : (
          <div className={note}>
            No account yet? <Link href="/register" className="underline underline-offset-3 hover:text-fg-muted">Create one</Link>, or buy a guide: your library is created with your first purchase.
          </div>
        )}
      </div>
    </div>
  );
}
