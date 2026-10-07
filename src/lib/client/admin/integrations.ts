"use client";

/**
 * Settings › Integrations, Payments & tax and Simulation (owner only, docs/admin-v2/03, 01 §7, 02 §5):
 * mode per integration, test events, the VAT regime, the GPU budget, the simulation's seed, clock and
 * hands-off window, and "Reset my actions". Each writes the admin overlay and an audit line.
 */
import { setClockOverride } from "@/lib/clock";
import { getMode, integration, liveBlockedReason, type IntegrationMode } from "@/lib/integrations";
import { adminNow, adminStore, audit, insertRow, patchRow, requireStaff } from "../admin";
import { purchasesStore } from "../purchases";

export function setIntegrationMode(id: string, mode: IntegrationMode) {
  const staff = requireStaff("owner");
  const i = integration(id);
  if (!i) throw new Error("Unknown integration.");
  if (mode === "live") {
    const blocked = liveBlockedReason(i);
    if (blocked) throw new Error(blocked);
  }
  patchRow("integration_modes", id, { mode }, { action: "integration.mode", target: `integration:${id}`, summary: `${staff.fullName} set ${i.name} to ${mode === "live" ? "Live" : mode === "mock" ? "Mock" : "Off"}` });
}

/** "Send test event": one inbound event, as the vendor's webhook would send it, written to the logs. */
export function sendTestEvent(id: string) {
  const staff = requireStaff("owner");
  const i = integration(id);
  if (!i) throw new Error("Unknown integration.");
  const mode = getMode(id);
  if (mode === "off") throw new Error(`${i.name} is off.`);
  const operation = `${i.inbound.split(",")[0]!.trim() || "ping"} (test)`;
  insertRow("integration_logs", { at: adminNow(), integration: id, direction: "in", operation, mode: mode === "live" ? "live" : "mock", ok: mode !== "live" || !liveBlockedReason(i), related: null, detail: mode === "live" && liveBlockedReason(i) ? liveBlockedReason(i) : "Test event received" }, {
    action: "integration.test", target: `integration:${id}`, summary: `${staff.fullName} sent a test event to ${i.name}`,
  });
}

/** Settings › Payments & tax: collect VAT (today's store) or the franchise ("TVA non applicable, art. 293 B du CGI"). */
export function setVatRegime(regime: "collect" | "franchise") {
  const staff = requireStaff("owner");
  patchRow("business_settings", "vat_regime", { value: regime }, { action: "tax.regime", target: "setting:vat_regime", summary: `${staff.fullName} set the VAT regime to ${regime === "collect" ? "VAT collected" : "franchise en base (no VAT)"}` });
}

/** Settings › Shipping › Print lab: the studio's printer, or the external lab ("Send to lab" on the To print cards). */
export function setPrintLabMode(mode: "in_house" | "external") {
  const staff = requireStaff("owner");
  patchRow("business_settings", "print_lab_mode", { value: mode }, { action: "fulfilment.lab_mode", target: "setting:print_lab_mode", summary: `${staff.fullName} set printing to ${mode === "external" ? "the external lab" : "the in-house printer"}` });
}

/** Settings › Integrations › GPU provider: the monthly budget the AI pipeline checks before a job. */
export function setGpuBudget(cents: number) {
  const staff = requireStaff("owner");
  if (!Number.isFinite(cents) || cents < 0 || cents > 100_000) throw new Error("Enter a budget between $0 and $1,000.");
  patchRow("business_settings", "ai_budget_cents", { value: String(Math.round(cents)) }, { action: "ai.budget", target: "setting:ai_budget_cents", summary: `${staff.fullName} set the GPU budget to $${(cents / 100).toFixed(2)} a month` });
}

/** Settings › Simulation: seed and hands-off window (another seed is another history; your actions stay). */
export function setSimulation(changes: { seed?: string; handsOffHours?: number }) {
  const staff = requireStaff("owner");
  if (changes.seed !== undefined && !changes.seed.trim()) throw new Error("Enter a seed.");
  if (changes.handsOffHours !== undefined && !(changes.handsOffHours >= 0 && changes.handsOffHours <= 240)) throw new Error("Hands-off hours go from 0 to 240.");
  const what = changes.seed !== undefined ? `the seed to “${changes.seed.trim()}”` : `the hands-off window to ${changes.handsOffHours} h`;
  patchRow("sim_settings", "sim", { ...changes, ...(changes.seed ? { seed: changes.seed.trim() } : {}) }, { action: "sim.settings", target: "setting:simulation", summary: `${staff.fullName} set ${what}` });
}

/** "Regenerate": a new seed, so a new history (the overlay is kept). */
export function regenerateSimulation() {
  const seed = `geste-${Math.random().toString(36).slice(2, 8)}`;
  setSimulation({ seed });
  return seed;
}

/** Clock: real time, or a fixed date-time for this tab (the top bar shows a chip). */
export function setSimulationClock(iso: string | null) {
  const staff = requireStaff("owner");
  setClockOverride(iso);
  audit({ action: "sim.clock", target: "setting:clock", summary: iso ? `${staff.fullName} set the clock to ${iso}` : `${staff.fullName} set the clock back to real time` });
}

/** "Reset my actions": forget every admin change and every purchase made in this browser (the session stays). */
export function resetMyActions() {
  requireStaff("owner");
  adminStore.reset();
  purchasesStore.reset();
}
