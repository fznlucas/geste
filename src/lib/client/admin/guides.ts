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

/** Deletes a step; the following ones move up ("2d" becomes "2c"). A layer keeps at least one step. */
export async function deleteStep(guideId: string, layer: number, step: number): Promise<void> {
  saveDraft(guideId, (c) => {
    const l = layerOf(c, layer);
    if (l.steps.length <= 1) throw new Error("A layer keeps at least one step: delete the layer's content instead.");
    l.steps = l.steps.filter((s) => s.position !== step).map((s, i) => ({ ...s, position: i + 1 }));
  });
  const staff = requireStaff("content");
  audit({ action: "guide.delete_step", target: `guide:${guideId}`, summary: `${staff.fullName} deleted step ${layer}${LETTERS[step - 1]} of ${await label(guideId)}` });
}

/** Moves a step one place up or down in its layer (the keyboard way to reorder). Resolves with its new id. */
export async function moveStep(guideId: string, layer: number, step: number, by: -1 | 1): Promise<string> {
  let id = `${layer}${LETTERS[step - 1]}`;
  saveDraft(guideId, (c) => {
    const l = layerOf(c, layer);
    const i = l.steps.findIndex((s) => s.position === step), j = i + by;
    if (i < 0 || j < 0 || j >= l.steps.length) return;
    [l.steps[i], l.steps[j]] = [l.steps[j]!, l.steps[i]!];
    l.steps = l.steps.map((s, k) => ({ ...s, position: k + 1 }));
    id = `${layer}${LETTERS[j]}`;
  });
  const staff = requireStaff("content");
  auditEdit(guideId, `${staff.fullName} reordered the steps of ${await label(guideId)}`);
  return id;
}

/** "Edit strokes": the strokes of one layer, as edited in the list (order = painting order). */
export async function saveStrokes(guideId: string, layer: number, strokes: GuideContentLayer["diagram"]): Promise<void> {
  saveDraft(guideId, (c) => {
    layerOf(c, layer).diagram = strokes.map((s) => ({ ...s, layer }));
  });
  const staff = requireStaff("content");
  audit({ action: "guide.strokes", target: `guide:${guideId}`, summary: `${staff.fullName} edited the strokes of layer ${String(layer).padStart(2, "0")} of ${await label(guideId)} (${strokes.length})` });
}

/** Brush widths of the kit, in canvas units (600 × 800): the stroke list offers these. */
export const BRUSH_WIDTHS: Array<[string, number]> = [["50 mm flat", 70], ["25 mm flat", 40], ["Round n°6", 14], ["Palette knife", 30]];

/**
 * "Import from AI": the stroke plan of an approved candidate becomes the strokes of every layer of the
 * draft (deterministic from the candidate: the mock's worker returns counts, not geometry), in the
 * layers' own colours. Steps and texts are kept.
 */
export async function importStrokesFromAi(guideId: string, candidate: { id: string; strokes: number; layers: number }): Promise<number> {
  let count = 0;
  saveDraft(guideId, (c) => {
    let seed = 0;
    for (const ch of candidate.id) seed = (Math.imul(seed ^ ch.charCodeAt(0), 16777619) + 2166136261) >>> 0;
    const rand = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) % 10_000) / 10_000;
    const perLayer = Math.max(3, Math.round(candidate.strokes / Math.max(1, c.layers.length)));
    for (const l of c.layers) {
      const colours = l.plate.length ? l.plate.map((p) => p.hex) : ["#1F2433"];
      const width = (BRUSH_WIDTHS.find(([b]) => b === l.brush) ?? BRUSH_WIDTHS[1]!)[1];
      l.diagram = Array.from({ length: perLayer }, (_, k) => {
        const x = 40 + rand() * 440, y = 60 + rand() * 640, dx = 80 + rand() * 180, dy = -60 + rand() * 120;
        return { layer: l.position, kind: "path" as const, d: `M${x.toFixed(0)} ${y.toFixed(0)} Q${(x + dx / 2).toFixed(0)} ${(y + dy - 40).toFixed(0)} ${(x + dx).toFixed(0)} ${(y + dy).toFixed(0)}`, color: colours[k % colours.length]!, width, opacity: 0.9 };
      });
      count += perLayer;
    }
  });
  const staff = requireStaff("content");
  audit({ action: "guide.import_ai", target: `guide:${guideId}`, summary: `${staff.fullName} imported the stroke plan of ${candidate.id} into ${await label(guideId)} (${count} strokes)` });
  return count;
}

/** History › Restore: a published version becomes the draft (publish it again to make it current). */
export async function restoreVersion(guideId: string, version: number, content: GuideContent): Promise<void> {
  saveDraft(guideId, (c) => {
    c.layers = structuredClone(content.layers);
    if (content.print) c.print = structuredClone(content.print);
  });
  const staff = requireStaff("content");
  audit({ action: "guide.restore", target: `guide:${guideId}`, summary: `${staff.fullName} restored version ${version} of ${await label(guideId)} as the draft` });
}

/** "Gesture video › Upload": sent to the video host (mock: logged, ready a few seconds later). */
export async function uploadGestureVideo(guideId: string, stepId: string, name: string): Promise<void> {
  const staff = requireStaff("content");
  insertRow("integration_logs", { at: adminNow(), integration: "mux", direction: "out", operation: "upload", mode: "mock", ok: true, related: `guide:${guideId}:${stepId}`, detail: name });
  insertRow("step_videos", { guideId, stepId, name, uploadedAtMs: Date.now() }, { action: "guide.video", target: `guide:${guideId}`, summary: `${staff.fullName} uploaded the gesture video of step ${stepId} (${name})` });
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
