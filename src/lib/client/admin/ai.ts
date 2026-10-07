"use client";

/**
 * AI pipeline actions (future `src/actions/admin/ai.ts`: createJob, approveCandidate, rejectCandidate).
 * Mock: the GPU worker is simulated in the browser: `advanceJobs` (called by the page every 2 s while
 * it is open) moves progress and, at 100 %, writes the job's candidates, as the worker's webhook will.
 */
import { AI_LIMITS, aiBudget, aiCandidateRow, type GuideContent, aiJobCostCents, aiJobLabel, allAiJobs, getAdminWorks, type AiJobParams } from "@/lib/api";
import { adminNow, insertRow, patchRow, requireStaff } from "../admin";
import { CANVASES, LEVELS, type LevelKey } from "@/lib/pricing";
import { call, logInbound } from "@/lib/integrations";

export class AiBudgetError extends Error {}

/** Field errors of the "New generation" form; empty when valid. */
export function validateJob(p: AiJobParams): Partial<Record<"maxStrokes" | "layers" | "candidates", string>> {
  const e: Partial<Record<"maxStrokes" | "layers" | "candidates", string>> = {};
  for (const key of ["maxStrokes", "layers", "candidates"] as const) {
    const [min, max] = AI_LIMITS[key];
    const v = p[key];
    if (!Number.isInteger(v) || v < min || v > max) e[key] = `Between ${min} and ${max}`;
  }
  return e;
}

/** "Generate 8 candidates": queues a job and charges its GPU estimate. Blocked when the budget is reached. */
export async function createJob(params: AiJobParams): Promise<number> {
  const staff = requireStaff("content");
  if (Object.keys(validateJob(params)).length) throw new Error("Check the settings");
  const cost = aiJobCostCents(params.candidates);
  if (cost > aiBudget().leftCents) throw new AiBudgetError("GPU budget reached for this month");
  const number = Math.max(...allAiJobs().map((j) => j.number)) + 1;
  const { callId } = await call("modal", "submit job", `ai_job:${number}`, (m) =>
    m.submitJob({ number, candidates: params.candidates, format: params.format, maxStrokes: params.maxStrokes, layers: params.layers }),
  );
  insertRow(
    "ai_jobs",
    { id: `job-${number}`, number, params, label: aiJobLabel(params), status: "queued", progress: 3, costCents: cost, createdAt: adminNow(), callId, startedAtMs: Date.now() },
    { action: "ai.job_create", target: `ai_job:${number}`, summary: `${staff.fullName} started AI job ${number} · ${params.candidates} candidates` },
  );
  return number;
}

/** Deterministic 0…1 from a string (similarity and stroke counts of simulated candidates). */
function unit(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const IMAGES = [1, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 2, 7];

/** One tick of the simulated worker: +1 % for the board's jobs, +3 % for new ones; done at 100 %. */
export function advanceJobs() {
  for (const job of allAiJobs()) {
    if (job.status !== "queued" && job.status !== "running") continue;
    // A job started here runs on the wall clock (3 % every 2 s, also while no admin page is open);
    // the board's jobs move 1 % per tick.
    const started = (job as { startedAtMs?: number }).startedAtMs;
    const progress = started ? Math.min(100, 3 + Math.floor((Date.now() - started) / 2000) * 3) : Math.min(100, job.progress + 1);
    if (progress === job.progress) continue;
    if (progress < 100) {
      patchRow("ai_jobs", job.id, { progress, status: "running" });
      continue;
    }
    patchRow("ai_jobs", job.id, { progress: 100, status: "done" });
    logInbound("modal", "webhook · job done", `ai_job:${job.number}`);
    const n = Math.min(job.params.candidates, 10);
    const made = Array.from({ length: n }, (_, i) => {
      const id = `C-${job.number}-${"abcdefghij"[i]}`;
      const similarity = 78 + Math.round(unit(id) * 19);
      const strokes = Math.round(job.params.maxStrokes * (0.45 + unit(`${id}s`) * 0.7));
      return { id, similarity, strokes };
    });
    const best = Math.max(...made.map((m) => m.similarity));
    made.forEach((m, i) =>
      insertRow("ai_candidates", {
        id: m.id,
        jobNumber: job.number,
        imagePath: `mock/work-${String(IMAGES[(job.number + i) % IMAGES.length]).padStart(2, "0")}.jpg`,
        similarity: m.similarity,
        strokes: m.strokes,
        layers: job.params.layers,
        note: m.strokes > job.params.maxStrokes ? "Too many strokes for level" : m.similarity < 85 ? "Low similarity" : m.similarity === best ? "Best score" : "",
        status: "pending",
        workSlug: null,
        createdAt: adminNow(),
      }),
    );
  }
}

/** The level of a stroke plan by its layers (pricing.ts LEVELS: 2 beginner, 3 intermediate, 5 advanced). */
const levelOfLayers = (layers: number): LevelKey => (layers <= 2 ? "beginner" : layers <= 3 ? "intermediate" : "advanced");

/** The guide drafted from a candidate's stroke plan: one layer per planned layer, its strokes split into steps. */
function strokePlanGuide(layers: number, strokes: number): GuideContent {
  const perLayer = Math.max(1, Math.round(strokes / layers));
  return {
    layers: Array.from({ length: layers }, (_, k) => ({
      position: k + 1,
      name: `Layer ${k + 1}`,
      brush: k === 0 ? "50 mm flat" : k === layers - 1 ? "Round n°6" : "25 mm flat",
      plate: [],
      tip: "",
      minutes: 30,
      drySeconds: k === layers - 1 ? 0 : 2700,
      diagram: [],
      steps: Array.from({ length: 5 }, (_, s) => ({ position: s + 1, text: `About ${Math.max(1, Math.round(perLayer / 5))} strokes, from the AI plan · write this step` })),
    })),
  };
}

/**
 * Approve: the candidate becomes a draft work (next number) on the job's canvas, at the level of its
 * layers, and its guide is drafted from the stroke plan (`ai_guide_drafts`, written in the editor before
 * it is published). (Duplicate images are checked by the GPU worker on real images: the mock's candidates
 * reuse the catalog's fifteen pictures.)
 */
export async function approveCandidate(id: string): Promise<string> {
  const staff = requireStaff("content");
  const c = aiCandidateRow(id);
  if (!c || c.status !== "pending") throw new Error("Already decided");
  const job = allAiJobs().find((j) => j.number === c.jobNumber);
  const all = await getAdminWorks();
  const n = Math.max(...all.map((w) => Number.parseInt(w.number.slice(2), 10) || 0)) + 1;
  const num = String(n).padStart(2, "0");
  const slug = `n${num}`;
  const format = job?.params.format ?? "40x50";
  const canvas = CANVASES[format];
  const proportion = canvas.proportion;
  const layers = c.layers || job?.params.layers || 3;
  const level = levelOfLayers(layers);
  // Canvases are listed portrait; a landscape work is the same canvas turned, set in the editor.
  const orientation = "portrait";
  const workId = `work-new-${slug}`;
  insertRow("works", {
    id: workId,
    number: `N°${num}`,
    slug,
    status: "draft",
    publishAt: null,
    proportion,
    // The canvas the job was generated on is the work's default and reference canvas.
    defaultFormat: format,
    originalSize: format,
    baseLevel: level,
    orientation,
    signature: false,
    // Read from the image at upload (works.preview_width / preview_height); 0 = not known yet.
    previewWidth: 0,
    previewHeight: 0,
    description: "",
    previewPath: c.imagePath,
    resultPhotoPath: null,
    studioTested: false,
    seoTitle: `N°${num} — paint it yourself · Geste`,
    seoDescription: "",
    sortOrder: 1000 + n,
    createdAt: adminNow(),
  });
  insertRow("ai_guide_drafts", { id: `guide-${slug}-${format}-${level}`, workId, format, level, fromCandidate: c.id, content: strokePlanGuide(layers, c.strokes), savedAt: adminNow() });
  patchRow("ai_candidates", id, { status: "approved", workSlug: slug }, { action: "ai.approve", target: `ai_candidate:${id}`, summary: `${staff.fullName} approved ${id} → N°${num} (draft, guide drafted · ${LEVELS[level].label}, ${layers} layers)` });
  return slug;
}

export async function rejectCandidate(id: string) {
  const staff = requireStaff("content");
  const c = aiCandidateRow(id);
  if (!c || c.status !== "pending") throw new Error("Already decided");
  patchRow("ai_candidates", id, { status: "rejected" }, { action: "ai.reject", target: `ai_candidate:${id}`, summary: `${staff.fullName} rejected ${id}` });
}
