"use client";

/**
 * /admin/login (AdminLogin): email + password → the 6-digit code of the authenticator app (AAL2),
 * or a passkey (itself two factors). Mock (docs/mock-plan.md "What the fakes do"): any password and
 * any 6 digits; every email signs in as Lucas · Owner. The login is written to the audit log.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, Input, Logo } from "@/components";
import { audit, isSixDigitCode, safeNext, signInStaff, useHydrated, useStaffSession } from "@/lib/client";
import { cn } from "@/lib/cn";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function AdminLoginPage() {
  const hydrated = useHydrated();
  const session = useStaffSession();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/admin");
  const [step, setStep] = useState<1 | 2>(1);
  // The admin's own address, as drawn on the board: the demo has one staff account.
  const [email, setEmail] = useState("lucas@geste.studio");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState<{ email?: string; password?: string; code?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.status === "signed_in") router.replace(next);
  }, [session.status, router, next]);

  const cont = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      email: EMAIL.test(email.trim()) ? undefined : email.trim() ? "This email looks incomplete" : "Enter your email",
      password: password ? undefined : "Enter your password",
    };
    setErr(errors);
    if (!errors.email && !errors.password) setStep(2);
  };

  const logIn = async (method: "password" | "passkey") => {
    if (method === "password" && !isSixDigitCode(code)) {
      setErr({ code: "Enter the 6 digits of the code" });
      return;
    }
    setBusy(true);
    const s = await signInStaff({ email: method === "passkey" ? "lucas@geste.studio" : email, totp: method === "passkey" ? "000000" : code });
    audit({ action: "staff.login", target: `staff:${s.staffId}`, summary: `Login · ${method === "passkey" ? "passkey" : "password + code"}` });
  };

  if (!hydrated || session.status === "signed_in") return <div aria-busy="true" className="min-h-dvh bg-bg" />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-16">
      <div className="flex w-380 max-w-full flex-col gap-16">
        <h1 className="flex items-center gap-8">
          <Logo size={14} />
          <span className="text-fg-muted">admin</span>
          <span className="sr-only">Log in</span>
        </h1>
        {step === 1 ? (
          <form onSubmit={cont} noValidate className="flex flex-col gap-14">
            <Field label="Email" error={err.email}>
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" error={err.password}>
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" trailing="→" fullWidth>Continue</Button>
            <Button variant="ghost" fullWidth onClick={() => logIn("passkey")} loading={busy}>Use a passkey</Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              logIn("password");
            }}
            noValidate
            className="flex flex-col gap-14"
          >
            <p>Enter the 6-digit code from your authenticator app.</p>
            <Field label="Code" error={err.code}>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={cn("text-code tracking-code")}
              />
            </Field>
            <Button type="submit" trailing="→" fullWidth loading={busy}>Log in</Button>
            <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-32 cursor-pointer items-center self-start underline underline-offset-3 hover:text-fg-muted">
              Back
            </button>
          </form>
        )}
        <p className="text-fg-muted">Admins only. Every login is written to the audit log.</p>
      </div>
    </main>
  );
}
