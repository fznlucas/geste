/**
 * AI pipeline (AdminAIPipeline): three running jobs and the five candidates to validate of the board.
 * GPU spending and budget: `site_settings` "ai.monthly_budget_cents" (seed: 8000) and the month's jobs.
 */
import type { AiCandidateRow, AiJobRow } from "./types";

export const AI_MONTHLY_BUDGET_CENTS = 8000;
/** GPU spent this month before the running jobs ("$38.20 of $80 budget"). */
export const AI_SPENT_CENTS = 3820;
/** "≈ $1.40 GPU" for 8 candidates. */
export const AI_CENTS_PER_CANDIDATE = 17.5;

export const aiJobs: AiJobRow[] = [
  { id: "job-118", number: 118, params: { style: "gestural", format: "60x80", medium: "acrylic", palette: "warm", maxStrokes: 120, layers: 3, candidates: 3 }, label: "Gestural · coral & blue · 60×80", status: "running", progress: 35, costCents: 53, createdAt: "2026-10-02T09:40:00Z" },
  { id: "job-117", number: 117, params: { style: "colour_field", format: "40x50", medium: "acrylic", palette: "earth", maxStrokes: 90, layers: 2, candidates: 3 }, label: "Colour field · earth · 40×50", status: "running", progress: 62, costCents: 53, createdAt: "2026-10-02T09:10:00Z" },
  { id: "job-116", number: 116, params: { style: "gestural", format: "30x40", medium: "acrylic", palette: "cool", maxStrokes: 80, layers: 2, candidates: 3 }, label: "Gestural · green · 30×40", status: "running", progress: 88, costCents: 53, createdAt: "2026-10-02T08:30:00Z" },
];

export const aiCandidates: AiCandidateRow[] = [
  { id: "C-114-a", jobNumber: 114, imagePath: "mock/work-04.jpg", similarity: 92, strokes: 84, layers: 3, note: "Beginner-friendly", status: "pending", workSlug: null, createdAt: "2026-10-01T16:00:00Z" },
  { id: "C-114-b", jobNumber: 114, imagePath: "mock/work-06.jpg", similarity: 88, strokes: 131, layers: 3, note: "Too many strokes for level", status: "pending", workSlug: null, createdAt: "2026-10-01T16:00:00Z" },
  { id: "C-115-a", jobNumber: 115, imagePath: "mock/work-10.jpg", similarity: 95, strokes: 96, layers: 3, note: "Best score", status: "pending", workSlug: null, createdAt: "2026-10-01T18:30:00Z" },
  { id: "C-115-b", jobNumber: 115, imagePath: "mock/work-05.jpg", similarity: 81, strokes: 72, layers: 2, note: "Low similarity", status: "pending", workSlug: null, createdAt: "2026-10-01T18:30:00Z" },
  { id: "C-115-c", jobNumber: 115, imagePath: "mock/work-02.jpg", similarity: 90, strokes: 58, layers: 2, note: "", status: "pending", workSlug: null, createdAt: "2026-10-01T18:30:00Z" },
];
