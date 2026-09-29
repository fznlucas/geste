"use client";

/**
 * Guide editor actions (future `src/actions/admin/guides.ts`: saveStep, saveLayer, addStep, publishGuide).
 * Mock: the draft is one "guide_drafts" patch per guide (the whole content, autosaved on every change);
 * Publish inserts a "guide_versions" row and moves the guide's `currentVersion`, like the database's
 * immutable snapshot. Drafts never reach buyers until then.
 */
import { getGuide, guideDraftContent, nextGuideVersion, type GuideContent, type GuideContentLayer } from "@/lib/api";
import { adminNow, adminStore, audit, insertRow, patchRow, requireStaff } from "../admin";

const LETTERS = "abcdefghij";
export const MAX_STEPS = LETTERS.length;

async function label(guideId: string): Promise<string> {
  const g = await getGuide(guideId);
  return g ? `guide ${g.workNumber}` : "a guide";
}

/**
 * One audit line per guide and editing session: autosave writes on every keystroke, the log keeps the
 * first edit of the last 10 minutes ("Lucas edited guide N°03 step 2c").
 */
function auditEdit(guideId: string, summary: string) {
  const last = adminStore.get().audit[0];
  if (last && last.action === "guide.edit" && last.target === `guide:${guideId}` && Date.parse(adminNow()) - Date.parse(last.at) < 10 * 60_000) return;
  audit({ action: "guide.edit", target: `guide:${guideId}`, summary });
}

function saveDraft(guideId: string, change: (c: GuideContent) => void) {
  requireStaff("content");
  const content = guideDraftContent(guideId);
  if (!content) throw new Error("Unknown guide");
  change(content);
  patchRow("guide_drafts", guideId, { content, savedAt: adminNow() });
  return content;
}

function layerOf(c: GuideContent, position: number): GuideContentLayer {
  const l = c.layers.find((x) => x.position === position);
  if (!l) throw new Error("Unknown layer");
  return l;
}

/** Instruction and brush of one step. `brush` null = the layer's brush. */
export async function saveStep(guideId: string, layer: number, step: number, changes: { text?: string; brush?: string | null }) {
  saveDraft(guideId, (c) => {
    const s = layerOf(c, layer).steps.find((x) => x.position === step);
    if (!s) throw new Error("Unknown step");
    if (changes.text !== undefined) s.text = changes.text;
    if (changes.brush !== undefined) {
      if (changes.brush) s.brush = changes.brush;
      else delete s.brush;
    }
  });
  const staff = requireStaff("content");
  auditEdit(guideId, `${staff.fullName} edited ${await label(guideId)} step ${layer}${LETTERS[step - 1]}`);
}

/** Name, brush, tip, painting time and drying time of a layer (the tip is shown on each of its steps). */
export async function saveLayer(guideId: string, layer: number, changes: Partial<Pick<GuideContentLayer, "name" | "brush" | "tip" | "minutes" | "drySeconds">>) {
  if (changes.minutes !== undefined && (!Number.isFinite(changes.minutes) || changes.minutes < 0)) throw new Error("Enter a number of minutes");
  if (changes.drySeconds !== undefined && (!Number.isFinite(changes.drySeconds) || changes.drySeconds < 0)) throw new Error("Enter a number of minutes");
  saveDraft(guideId, (c) => Object.assign(layerOf(c, layer), changes));
  const staff = requireStaff("content");
  auditEdit(guideId, `${staff.fullName} edited ${await label(guideId)} layer ${String(layer).padStart(2, "0")}`);
}

/** "+ Add a step": an empty step at the end of the layer. Resolves with its id ("2f"). */
export async function addStep(guideId: string, layer: number): Promise<string> {
  let id = "";
  saveDraft(guideId, (c) => {
    const l = layerOf(c, layer);
    if (l.steps.length >= MAX_STEPS) throw new Error(`A layer has ${MAX_STEPS} steps at most`);
    const position = l.steps.length + 1;
    l.steps.push({ position, text: "" });
    id = `${layer}${LETTERS[position - 1]}`;
  });
  const staff = requireStaff("content");
  audit({ action: "guide.add_step", target: `guide:${guideId}`, summary: `${staff.fullName} added step ${id} to ${await label(guideId)}` });
  return id;
}

/** "+ Add a layer": a new last layer with one empty step and no strokes yet. Resolves with its first step id. */
export async function addLayer(guideId: string): Promise<string> {
  let id = "";
  saveDraft(guideId, (c) => {
    const position = c.layers.length + 1;
    c.layers.push({ position, name: "New layer", brush: "25 mm flat", plate: [], tip: "", minutes: 30, drySeconds: 0, diagram: [], steps: [{ position: 1, text: "" }] });
    id = `${position}a`;
  });
  const staff = requireStaff("content");
  audit({ action: "guide.add_layer", target: `guide:${guideId}`, summary: `${staff.fullName} added layer ${id.slice(0, -1).padStart(2, "0")} to ${await label(guideId)}` });
  return id;
}

export class GuideInvalidError extends Error {}

/** Publish: the draft becomes version n+1, which buyers read from now on. Empty steps block it. */
export async function publishGuide(guideId: string): Promise<number> {
  const staff = requireStaff("content");
  const content = guideDraftContent(guideId);
  if (!content) throw new Error("Unknown guide");
  const empty = content.layers.flatMap((l) => l.steps.filter((s) => !s.text.trim()).map((s) => `${l.position}${LETTERS[s.position - 1]}`));
  if (empty.length) throw new GuideInvalidError(`Write step ${empty.join(", ")} before publishing`);
  const version = nextGuideVersion(guideId);
  const at = adminNow();
  insertRow("guide_versions", { id: `${guideId}-v${version}`, guideId, version, content, publishedAt: at, publishedBy: staff.fullName });
  patchRow("guides", guideId, { currentVersion: version });
  patchRow("guide_drafts", guideId, { content: null, savedAt: null }, { action: "guide.publish", target: `guide:${guideId}`, summary: `${staff.fullName} published ${await label(guideId)} (v${version})` });
  return version;
}
