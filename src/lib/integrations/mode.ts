/**
 * Mock / Live / Off per integration (docs/admin-v2/03 §1). Resolution: the owner's choice in
 * Settings › Integrations (admin overlay), else `NEXT_PUBLIC_INTEGRATION_<ID>=live|mock|off`, else the
 * registry default. Live is only allowed when it can work: an integration that needs a server stays
 * disabled with the reason until NEXT_PUBLIC_API_BASE is set.
 */
import { patched } from "@/lib/api/local";
import { INTEGRATIONS, integration, type Integration } from "./registry";

export type IntegrationMode = "mock" | "live" | "off";

/** The backend URL, once there is one (the static export has none). */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

const envMode = (id: string): IntegrationMode | null => {
  // Static references so Next inlines them at build time is not possible for computed names; read the
  // whole env object (empty in the browser unless NEXT_PUBLIC_* were set at build).
  const v = (process.env as Record<string, string | undefined>)[`NEXT_PUBLIC_INTEGRATION_${id.toUpperCase().replace(/-/g, "_")}`];
  return v === "live" || v === "mock" || v === "off" ? v : null;
};

export function getMode(id: string): IntegrationMode {
  const i = integration(id);
  if (!i) return "off";
  const chosen = patched("integration_modes", { id, mode: "" as string }).mode;
  if (chosen === "live" || chosen === "mock" || chosen === "off") return chosen;
  return envMode(id) ?? i.defaultMode;
}

/** Why Live cannot be chosen, or null when it can. */
export function liveBlockedReason(i: Integration): string | null {
  if (i.needsServer && !API_BASE) return "Needs a server · set NEXT_PUBLIC_API_BASE";
  return null;
}

/** Env vars a live connection still lacks, as far as the browser can tell (public ones only; secrets are checked by the server). */
export function missingPublicEnv(i: Integration): string[] {
  const env = process.env as Record<string, string | undefined>;
  return i.env.filter((k) => k.startsWith("NEXT_PUBLIC_") && !env[k]);
}

export interface IntegrationStatus {
  mode: IntegrationMode;
  /** Status chip: dot + word ("Mock", "Live · connected", "Live · missing config", "Off"). */
  label: string;
  state: "done" | "todo" | "issue" | "off";
  liveBlocked: string | null;
}

export function statusOf(i: Integration): IntegrationStatus {
  const mode = getMode(i.id);
  const liveBlocked = liveBlockedReason(i);
  if (mode === "off") return { mode, label: "Off", state: "off", liveBlocked };
  if (mode === "mock") return { mode, label: "Mock", state: "todo", liveBlocked };
  const missing = missingPublicEnv(i);
  if (liveBlocked || missing.length) return { mode, label: `Live · missing ${missing[0] ?? "config"}`, state: "issue", liveBlocked };
  return { mode, label: "Live · connected", state: "done", liveBlocked };
}

/** "Mock: 34 · Live: 0" on the dashboard. */
export function modeCounts(): { mock: number; live: number; off: number } {
  const c = { mock: 0, live: 0, off: 0 };
  for (const i of INTEGRATIONS) c[getMode(i.id)] += 1;
  return c;
}
