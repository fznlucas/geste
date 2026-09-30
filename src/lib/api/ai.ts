/**
 * AI pipeline (AdminAIPipeline): jobs, candidates, GPU budget. Reads through the admin overlay: jobs
 * started, progress and decisions made in this browser (`src/lib/client/admin/ai.ts`) show at once.
 * Later: `ai_jobs`, `ai_candidates` (written by the GPU worker) and `site_settings`.
 */
import { asset } from "@/lib/asset";
import { CANVASES, formatLabel, type FormatKey } from "@/lib/pricing";
import { AI_CENTS_PER_CANDIDATE, AI_MONTHLY_BUDGET_CENTS, AI_SPENT_CENTS, aiCandidates, aiJobs } from "@/data/ai";
import type { AiCandidateRow, AiJobRow } from "@/data/types";
import { setAiToReviewSource } from "./admin";
import { clone } from "./clone";
import { merged } from "./local";
import type { PaletteKey } from "./types";

export type AiStyle = AiJobRow["params"]["style"];
export type AiMedium = AiJobRow["params"]["medium"];
export type AiJobParams = AiJobRow["params"];

export const AI_STYLES: Array<{ value: AiStyle; label: string; short: string }> = [
  { value: "gestural", label: "Gestural abstraction (studio LoRA v2)", short: "Gestural" },
  { value: "colour_field", label: "Colour field", short: "Colour field" },
  { value: "drips_veils", label: "Drips & veils", short: "Drips & veils" },
];
export const AI_MEDIUMS: Array<{ value: AiMedium; label: string }> = [
  { value: "acrylic", label: "Acrylic" },
  { value: "gouache", label: "Gouache" },
];
/** "Palette = your real tubes": the four palettes of the shop. */
export const AI_PALETTES: Array<{ value: PaletteKey; label: string }> = [
  { value: "original", label: "Original (turquoise, Payne’s grey, yellow, orange)" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "earth", label: "Earth" },
];
/** The stock canvases, by proportion family: the generated work keeps that proportion. */
export const AI_FORMATS = Object.keys(CANVASES) as FormatKey[];
export const AI_LIMITS = { maxStrokes: [20, 400], layers: [1, 5], candidates: [1, 24] } as const;

export interface AiJob {
  id: string;
  number: number;
  /** "Job 118" */
  name: string;
  label: string;
  params: AiJobParams;
  status: AiJobRow["status"];
  progress: number;
  /** "Queued", "Generating target", "Decomposing into strokes", "Rendering with pigment sim" */
  stage: string;
  costCents: number;
  createdAt: string;
}

export interface AiCandidate {
  id: string;
  jobNumber: number;
  imageUrl: string;
  imagePath: string;
  similarity: number;
  strokes: number;
  layers: number;
  note: string;
  /** The note warns (Signal): too many strokes, low similarity. */
  warning: boolean;
  status: AiCandidateRow["status"];
  workSlug: string | null;
}

export interface AiBudget {
  budgetCents: number;
  spentCents: number;
  leftCents: number;
}

export interface AiPipeline {
  running: AiJob[];
  candidates: AiCandidate[];
  toValidate: number;
  budget: AiBudget;
  nextJobNumber: number;
}

export const allAiJobs = () => merged("ai_jobs", aiJobs);
export const allAiCandidates = () => merged("ai_candidates", aiCandidates);

export function aiStage(progress: number): string {
  if (progress < 5) return "Queued";
  if (progress < 50) return "Generating target";
  if (progress < 80) return "Decomposing into strokes";
  return "Rendering with pigment sim";
}

/** "≈ $1.40 GPU": the estimate shown on the Generate button, charged when the job starts. */
export const aiJobCostCents = (candidates: number) => Math.round(candidates * AI_CENTS_PER_CANDIDATE);

/** "Gestural · warm · 60×80" */
export function aiJobLabel(p: AiJobParams): string {
  return `${AI_STYLES.find((s) => s.value === p.style)!.short} · ${p.palette} · ${formatLabel(p.format)}`;
}

export function aiBudget(): AiBudget {
  // Mock jobs are in AI_SPENT_CENTS already; jobs started in this browser are added.
  const mockIds = new Set(aiJobs.map((j) => j.id));
  const spent = AI_SPENT_CENTS + allAiJobs().filter((j) => !mockIds.has(j.id)).reduce((s, j) => s + j.costCents, 0);
  return { budgetCents: AI_MONTHLY_BUDGET_CENTS, spentCents: spent, leftCents: Math.max(0, AI_MONTHLY_BUDGET_CENTS - spent) };
}

function mapJob(j: AiJobRow): AiJob {
  return { id: j.id, number: j.number, name: `Job ${j.number}`, label: j.label, params: j.params, status: j.status, progress: j.progress, stage: aiStage(j.progress), costCents: j.costCents, createdAt: j.createdAt };
}

function mapCandidate(c: AiCandidateRow): AiCandidate {
  return { id: c.id, jobNumber: c.jobNumber, imageUrl: asset(c.imagePath), imagePath: c.imagePath, similarity: c.similarity, strokes: c.strokes, layers: c.layers, note: c.note, warning: /^(Too|Low)/.test(c.note), status: c.status, workSlug: c.workSlug };
}

const pendingCount = () => allAiCandidates().filter((c) => c.status === "pending").length;
setAiToReviewSource(pendingCount);

export async function getAiPipeline(): Promise<AiPipeline> {
  const jobs = allAiJobs();
  const mockIds = new Set(aiJobs.map((j) => j.id));
  return clone({
    // As on the board: the running jobs newest first, then the ones queued from this page in order.
    running: jobs
      .filter((j) => j.status === "queued" || j.status === "running")
      .sort((a, b) => (mockIds.has(a.id) === mockIds.has(b.id) ? (mockIds.has(a.id) ? b.number - a.number : a.number - b.number) : mockIds.has(a.id) ? -1 : 1))
      .map(mapJob),
    candidates: allAiCandidates().sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true })).map(mapCandidate),
    toValidate: pendingCount(),
    budget: aiBudget(),
    nextJobNumber: Math.max(...jobs.map((j) => j.number)) + 1,
  });
}

/** Sync reads for the actions. */
export const aiJobRow = (id: string) => allAiJobs().find((j) => j.id === id) ?? null;
export const aiCandidateRow = (id: string) => allAiCandidates().find((c) => c.id === id) ?? null;
