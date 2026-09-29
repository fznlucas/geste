"use client";

import { useEffect, useState } from "react";
import { MOCK_NOW, setAdminOverlaySource, type AdminOverlay } from "@/lib/api";
import type { StaffRole } from "@/lib/types";
import { usePurchases } from "./purchases";
import { sessionStore } from "./session";
import { createPersistentStore, isRecord, newId, useStore } from "./store";

/**
 * Admin mutations of the mock (docs/mock-plan.md M6), kept in localStorage ("geste.admin.v2"):
 * patches keyed by table and row id, rows inserted in this browser (refunds, shipments, notes…)
 * and the audit log shown on Settings › Security. `@/lib/api` merges them into every read, so the
 * admin pages see their own changes. The store pages are built at deploy time and ignore them.
 *
 * Domain actions live next to this file (`src/lib/client/admin/*.ts`) and carry the names of the
 * future server actions (`src/actions/admin/*.ts`): `requireStaff(role)` → change → `audit(...)`.
 */

export interface AuditEntry {
  id: string;
  at: string;
  staffId: string;
  /** "Lucas" */
  staffName: string;
  /** "order.refund", "guide.publish", "staff.invite" (audit_log.action) */
  action: string;
  /** "order:GS-2030" */
  target: string;
  /** Sentence of the audit log: "Lucas refunded #GS-2030 · $25" */
  summary: string;
}

interface AdminState extends AdminOverlay {
  audit: AuditEntry[];
}

const EMPTY: AdminState = { patches: {}, inserts: {}, audit: [] };

export const adminStore = createPersistentStore<AdminState>("admin", 2, EMPTY, (raw) => {
  if (!isRecord(raw) || !isRecord(raw.patches) || !isRecord(raw.inserts) || !Array.isArray(raw.audit)) return null;
  return raw as unknown as AdminState;
});

setAdminOverlaySource(() => adminStore.get());

// ── Roles ────────────────────────────────────────────────────────────────────

/** docs/admin.md "Roles": the owner passes every check. */
export function hasRole(role: StaffRole | undefined, needed: StaffRole | StaffRole[]): boolean {
  if (!role) return false;
  return role === "owner" || ([] as StaffRole[]).concat(needed).includes(role);
}

export class ForbiddenError extends Error {
  constructor(message = "Your role cannot do this.") {
    super(message);
  }
}

/** Future `requireStaff(role)`: the signed-in staff member, or throws. */
export function requireStaff(needed?: StaffRole | StaffRole[]) {
  const staff = sessionStore.get().staff;
  if (!staff) throw new ForbiddenError("Log in again.");
  if (needed && !hasRole(staff.role, needed)) throw new ForbiddenError();
  return staff;
}

/**
 * Demo role switch ("Demo data" menu in the admin top bar): the same person seen as Owner, Support,
 * Fulfilment or Content, so each role's navigation and permissions can be tried. Not audited.
 */
export function setDemoRole(role: StaffRole) {
  sessionStore.set((s) => (s.staff ? { ...s, staff: { ...s.staff, role } } : s));
}

// ── Writes ───────────────────────────────────────────────────────────────────

/** Mock "now": never before the mock's now, so a change made today sorts after the mock rows. */
export function adminNow(): string {
  return new Date(Math.max(Date.now(), Date.parse(MOCK_NOW))).toISOString();
}

function auditEntry(action: string, target: string, summary: string): AuditEntry {
  const staff = sessionStore.get().staff;
  return { id: newId("audit"), at: adminNow(), staffId: staff?.staffId ?? "", staffName: staff?.fullName ?? "", action, target, summary };
}

export interface AuditInput {
  action: string;
  target: string;
  summary: string;
}

/** Changes columns of one row (e.g. `patchRow("print_copies", id, { fulfilment: "packed" }, audit)`). */
export function patchRow(table: string, id: string, changes: Record<string, unknown>, audit?: AuditInput) {
  adminStore.set((s) => ({
    ...s,
    patches: { ...s.patches, [table]: { ...s.patches[table], [id]: { ...s.patches[table]?.[id], ...changes } } },
    audit: audit ? [auditEntry(audit.action, audit.target, audit.summary), ...s.audit] : s.audit,
  }));
}

/** Adds a row (refund, shipment, note…). Returns it with its id. */
export function insertRow<T extends Record<string, unknown>>(table: string, row: T & { id?: string }, audit?: AuditInput): T & { id: string } {
  const full = { ...row, id: row.id ?? newId(table) } as T & { id: string };
  adminStore.set((s) => ({
    ...s,
    inserts: { ...s.inserts, [table]: [full, ...(s.inserts[table] ?? []).filter((r) => r.id !== full.id)] },
    audit: audit ? [auditEntry(audit.action, audit.target, audit.summary), ...s.audit] : s.audit,
  }));
  return full;
}

/** Removes a row this browser inserted (e.g. a pending invite). */
export function deleteInsertedRow(table: string, id: string, audit?: AuditInput) {
  adminStore.set((s) => ({
    ...s,
    inserts: { ...s.inserts, [table]: (s.inserts[table] ?? []).filter((r) => r.id !== id) },
    audit: audit ? [auditEntry(audit.action, audit.target, audit.summary), ...s.audit] : s.audit,
  }));
}

/** An audit line without a data change (login, export, "resend receipt"). */
export function audit(entry: AuditInput) {
  adminStore.set((s) => ({ ...s, audit: [auditEntry(entry.action, entry.target, entry.summary), ...s.audit] }));
}

export function useAudit(): AuditEntry[] {
  return useStore(adminStore).audit;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export type AdminQuery<T> = { status: "loading"; data: undefined } | { status: "ready"; data: T };

/**
 * Runs an `@/lib/api` read in the browser and runs it again whenever the admin overlay or the local
 * purchases change (in this tab or another). `deps` are the read's own inputs.
 */
export function useAdminQuery<T>(load: () => Promise<T>, deps: readonly unknown[]): AdminQuery<T> {
  const overlay = useStore(adminStore);
  const purchases = usePurchases();
  const [state, setState] = useState<AdminQuery<T>>({ status: "loading", data: undefined });
  useEffect(() => {
    let live = true;
    load().then((data) => live && setState({ status: "ready", data }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, purchases, ...deps]);
  return state;
}
