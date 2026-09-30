"use client";

/**
 * AI pipeline actions (future `src/actions/admin/ai.ts`: createJob, approveCandidate, rejectCandidate).
 * Mock: the GPU worker is simulated in the browser: `advanceJobs` (called by the page every 2 s while
 * it is open) moves progress and, at 100 %, writes the job's candidates, as the worker's webhook will.
 */
import { AI_LIMITS, aiBudget, aiCandidateRow, aiJobCostCents, aiJobLabel, allAiJobs, getAdminWorks, type AiJobParams } from "@/lib/api";
import { adminNow, insertRow, patchRow, requireStaff } from "../admin";
import { CANVASES, mediumFormat } from "@/lib/pricing";

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
  insertRow(
    "ai_jobs",
    { id: `job-${number}`, number, params, label: aiJobLabel(params), status: "queued", progress: 3, costCents: cost, createdAt: adminNow() },
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
    const progress = Math.min(100, job.progress + (job.number <= 118 ? 1 : 3));
    if (progress < 100) {
      patchRow("ai_jobs", job.id, { progress, status: "running" });
      continue;
    }
    patchRow("ai_jobs", job.id, { progress: 100, status: "done" });
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

/** Approve: the candidate becomes a draft work (next number) whose guide is drafted from its stroke plan. */
export async function approveCandidate(id: string): Promise<string> {
  const staff = requireStaff("content");
  const c = aiCandidateRow(id);
  if (!c || c.status !== "pending") throw new Error("Already decided");
  const job = allAiJobs().find((j) => j.number === c.jobNumber);
  const all = await getAdminWorks();
  const n = Math.max(...all.map((w) => Number.parseInt(w.number.slice(2), 10) || 0)) + 1;
  const num = String(n).padStart(2, "0");
  const slug = `n${num}`;
  const proportion = CANVASES[job?.params.format ?? "40x50"].proportion;
  insertRow("works", {
    id: `work-new-${slug}`,
    number: `N°${num}`,
    slug,
    status: "draft",
    publishAt: null,
    // The proportion of the canvas it was generated on; its medium canvas is the default.
    proportion,
    defaultFormat: mediumFormat(proportion),
    baseLevel: "intermediate",
    orientation: "portrait",
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
  patchRow("ai_candidates", id, { status: "approved", workSlug: slug }, { action: "ai.approve", target: `ai_candidate:${id}`, summary: `${staff.fullName} approved ${id} → N°${num} (draft)` });
  return slug;
}

export async function rejectCandidate(id: string) {
  const staff = requireStaff("content");
  const c = aiCandidateRow(id);
  if (!c || c.status !== "pending") throw new Error("Already decided");
  patchRow("ai_candidates", id, { status: "rejected" }, { action: "ai.reject", target: `ai_candidate:${id}`, summary: `${staff.fullName} rejected ${id}` });
}
