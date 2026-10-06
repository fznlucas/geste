"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CUSTOMER_ID, DEMO_STAFF_ID, findCustomerByEmail, getCustomer, getStaffMember, sessionExpired } from "@/lib/api";
import { clockSource } from "@/lib/clock";
import type { StaffRole } from "@/lib/types";
import { createPersistentStore, isRecord, useHydrated, useStore } from "./store";

/**
 * Fake sign-in for the mock (no Supabase Auth on GitHub Pages), kept in localStorage
 * ("geste.session.v1"). Nothing is checked: any password, passkey or 6-digit code works.
 * An email that belongs to a mock customer signs in as that customer; any other email signs in as
 * the demo customer (Camille, "Hi Camille" on the Account board).
 * The admin has its own session (staff + TOTP) as in production, where `/admin/**` needs AAL2.
 *
 * Guards run in the browser (`useRequireCustomer`, `useRequireStaff`) because a static export has
 * no middleware. Later: `src/lib/auth.ts` (getSession, requireUser, requireStaff) + middleware.ts.
 */

export type SignInMethod = "password" | "passkey" | "email_code";

export interface CustomerSession {
  userId: string;
  email: string;
  fullName: string;
  /** "Hi Camille" */
  firstName: string;
  method: SignInMethod;
  signedInAt: string;
}

export interface StaffSession {
  staffId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  /** TOTP verified (AAL2). */
  aal2: true;
  signedInAt: string;
}

interface SessionState {
  customer: CustomerSession | null;
  staff: StaffSession | null;
}

const SIGNED_OUT: SessionState = { customer: null, staff: null };
const METHODS: SignInMethod[] = ["password", "passkey", "email_code"];
const ROLES: StaffRole[] = ["owner", "support", "fulfilment", "content"];

const str = (v: unknown): v is string => typeof v === "string" && v.length > 0;

function parseCustomer(raw: unknown): CustomerSession | null {
  if (!isRecord(raw) || !str(raw.userId) || !str(raw.email) || !str(raw.fullName) || !str(raw.firstName) || !str(raw.signedInAt)) return null;
  if (!METHODS.includes(raw.method as SignInMethod)) return null;
  return { userId: raw.userId, email: raw.email, fullName: raw.fullName, firstName: raw.firstName, method: raw.method as SignInMethod, signedInAt: raw.signedInAt };
}

function parseStaff(raw: unknown): StaffSession | null {
  if (!isRecord(raw) || !str(raw.staffId) || !str(raw.email) || !str(raw.fullName) || !str(raw.signedInAt) || raw.aal2 !== true) return null;
  if (!ROLES.includes(raw.role as StaffRole)) return null;
  return { staffId: raw.staffId, email: raw.email, fullName: raw.fullName, role: raw.role as StaffRole, aal2: true, signedInAt: raw.signedInAt };
}

export const sessionStore = createPersistentStore<SessionState>("session", 1, SIGNED_OUT, (raw) =>
  isRecord(raw) ? { customer: parseCustomer(raw.customer), staff: parseStaff(raw.staff) } : null,
);

/** A 6-digit code as typed in <OtpInput>. The mock accepts any. */
export const isSixDigitCode = (code: string) => /^\d{6}$/.test(code);

/**
 * Log in (Login board: password, passkey, email code) and after a mock checkout. Resolves with the
 * session; rejects only when the email is empty (the passkey signs in as the demo customer).
 */
export async function signIn(input: { method: SignInMethod; email?: string }): Promise<CustomerSession> {
  const email = input.email?.trim();
  if (input.method !== "passkey" && !email) throw new Error("Enter your email.");
  const known = email ? await findCustomerByEmail(email) : null;
  const customer = known ?? (await getCustomer(DEMO_CUSTOMER_ID))!;
  const session: CustomerSession = {
    userId: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    firstName: customer.fullName.split(" ")[0]!,
    method: input.method,
    signedInAt: new Date().toISOString(),
  };
  sessionStore.set((s) => ({ ...s, customer: session }));
  return session;
}

/** Set by `signOut` so the guard of the page being left does not send it to /login. */
let leaving = false;

/** "Log out" on the Account tabs, then the caller navigates away. Keeps the cart, like a guest cookie cart. */
export function signOut() {
  leaving = true;
  sessionStore.set((s) => ({ ...s, customer: null }));
}

/**
 * /admin/login: email + password, then the TOTP code (any 6 digits in the mock). Someone invited in
 * Settings › Team signs in with the invite's role; the first sign-in accepts the invite with 2FA set up.
 */
export async function signInStaff(input: { email: string; totp: string }): Promise<StaffSession> {
  if (!isSixDigitCode(input.totp)) throw new Error("Enter the 6-digit code from your app.");
  const member = (await getStaffMember({ email: input.email })) ?? (await getStaffMember({ id: DEMO_STAFF_ID }))!;
  const session: StaffSession = { staffId: member.id, email: member.email, fullName: member.fullName, role: member.role, aal2: true, signedInAt: new Date().toISOString() };
  if (member.inviteId && !member.totpEnabled) {
    // Loaded here, not at the top: the admin store reads this session.
    const { patchRow, adminNow } = await import("./admin");
    patchRow("staff_invites", member.inviteId, { acceptedAt: adminNow() });
  }
  sessionStore.set((s) => ({ ...s, staff: session }));
  return session;
}

export function signOutStaff() {
  sessionStore.set((s) => ({ ...s, staff: null }));
}

export type SessionStatus<T> = { status: "loading"; session: null } | { status: "signed_out"; session: null } | { status: "signed_in"; session: T };

/** "loading" until the stored session has been read (never render "signed out" UI before that). */
export function useSession(): SessionStatus<CustomerSession> {
  const hydrated = useHydrated();
  const { customer } = useStore(sessionStore);
  if (!hydrated) return { status: "loading", session: null };
  return customer ? { status: "signed_in", session: customer } : { status: "signed_out", session: null };
}

/**
 * Settings › Security "Session timeout": a staff session older than that signs out. Measured on the
 * wall clock, and only while the clock is real: a pinned or overridden clock (tests, Settings ›
 * Simulation) does not end sessions when it jumps.
 */
const staffSessionOver = (s: StaffSession) => clockSource() === "real" && sessionExpired(s.signedInAt, Date.now());

export function useStaffSession(): SessionStatus<StaffSession> {
  const hydrated = useHydrated();
  const { staff } = useStore(sessionStore);
  const over = !!staff && hydrated && staffSessionOver(staff);
  useEffect(() => {
    if (over) signOutStaff();
  }, [over]);
  if (!hydrated) return { status: "loading", session: null };
  if (over) return { status: "signed_out", session: null };
  return staff ? { status: "signed_in", session: staff } : { status: "signed_out", session: null };
}

/** Path + query of the current page, without the basePath (what `?next=` carries). */
function currentPath(): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const path = window.location.pathname.startsWith(base) ? window.location.pathname.slice(base.length) : window.location.pathname;
  return (path || "/") + window.location.search;
}

/** Where to go after login: only same-site paths, never "//evil.com". */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** /account/**, /learn/**: sends signed-out visitors to /login?next=… */
export function useRequireCustomer(): SessionStatus<CustomerSession> {
  const state = useSession();
  const router = useRouter();
  useEffect(() => {
    if (state.status !== "signed_out") return;
    if (leaving) {
      leaving = false;
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(currentPath())}`);
  }, [state.status, router]);
  return state;
}

/** /admin/**: sends visitors without a staff session to /admin/login, and checks the role (owner passes every check). */
export function useRequireStaff(role?: StaffRole): SessionStatus<StaffSession> & { allowed: boolean } {
  const state = useStaffSession();
  const router = useRouter();
  useEffect(() => {
    if (state.status === "signed_out") router.replace(`/admin/login?next=${encodeURIComponent(currentPath())}`);
  }, [state.status, router]);
  const allowed = state.status === "signed_in" && (!role || state.session.role === "owner" || state.session.role === role);
  return { ...state, allowed };
}
