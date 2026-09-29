/**
 * Guide queries. Buyers read published versions only; the admin guide editor also reads the draft.
 * Mock: versions published and drafts saved in the admin (`src/lib/client/admin/guides.ts`) live in the
 * overlay ("guide_versions" rows, "guides" patches for `currentVersion`, "guide_drafts" patches), so the
 * reader of this browser follows a publish. On Supabase: guide_versions, guide_layers/steps, guide_print.
 */
import { asset } from "@/lib/asset";
import { LEVELS, estimatedTime, formatLabel, type FormatKey, type LevelKey } from "@/lib/pricing";
import type { GuideStep } from "@/lib/types";
import { N03_GUIDE_ID, guideVersions, guides } from "@/data/guides";
import type { GuideRow, GuideVersionContent } from "@/data/types";
import { works } from "@/data/works";
import { clone } from "./clone";
import { merged, patched } from "./local";
import type { Guide } from "./types";

/** A guide's layers and steps as stored in a version (and in the editor's draft). */
export type GuideContent = GuideVersionContent;
export type GuideContentLayer = GuideVersionContent["layers"][number];

interface VersionRow {
  id: string;
  guideId: string;
  version: number;
  content: GuideVersionContent;
  publishedAt: string;
  /** Staff name; null for the seed. */
  publishedBy?: string | null;
}

/** The row with the admin's changes (a publish moves `currentVersion`). */
const guideRow = (row: GuideRow): GuideRow => patched("guides", row);

function versionsOf(guideId: string): VersionRow[] {
  return merged<VersionRow>("guide_versions", guideVersions.map((v) => ({ ...v, id: `${v.guideId}-v${v.version}` })))
    .filter((v) => v.guideId === guideId)
    .sort((a, b) => b.version - a.version);
}

const STEP_LETTERS = "abcdefghij";

function publishedContent(row: GuideRow): { content: GuideVersionContent; isStandIn: boolean } {
  const own = versionsOf(row.id).find((v) => v.version === row.currentVersion);
  if (own) return { content: own.content, isStandIn: false };
  // Mock: N°03's layers (and printed copy), cut to the number of layers of the level.
  const n03 = guideVersions.find((v) => v.guideId === N03_GUIDE_ID)!.content;
  const layers = n03.layers.slice(0, LEVELS[row.level].layers);
  const print = n03.print && { ...n03.print, layers: n03.print.layers.slice(0, layers.length) };
  return { content: { layers, print }, isStandIn: true };
}

export function mapGuide(raw: GuideRow): Guide {
  const row = guideRow(raw);
  const work = works.find((w) => w.id === row.workId)!;
  const { content, isStandIn } = publishedContent(row);
  const layers = content.layers.map((l) => ({
    ...l,
    steps: l.steps.map((s) => ({ id: `${l.position}${STEP_LETTERS[s.position - 1]}`, position: s.position, text: s.text, brush: s.brush || l.brush })),
  }));
  return {
    id: row.id,
    workId: work.id,
    workNumber: work.number,
    workSlug: work.slug,
    imageUrl: asset(work.previewPath),
    orientation: work.orientation,
    format: row.format,
    formatLabel: formatLabel(row.format, work.orientation),
    level: row.level,
    levelLabel: LEVELS[row.level].label,
    version: row.currentVersion,
    isStandIn,
    layers,
    stepCount: layers.reduce((n, l) => n + l.steps.length, 0),
    duration: estimatedTime({ format: row.format, level: row.level, palette: "original" }),
    print: content.print ?? null,
  };
}

export async function getGuide(id: string): Promise<Guide | null> {
  const row = guides.find((g) => g.id === id);
  return row && guideRow(row).currentVersion > 0 ? clone(mapGuide(row)) : null;
}

export async function findGuide(workId: string, format: FormatKey, level: LevelKey): Promise<Guide | null> {
  const row = guides.find((g) => g.workId === workId && g.format === format && g.level === level);
  return row && guideRow(row).currentVersion > 0 ? clone(mapGuide(row)) : null;
}

/** Flat list of steps for <StepCard> / <StepProgress>. The drying time sits on the last step of its layer. */
export function flattenSteps(guide: Guide): GuideStep[] {
  return guide.layers.flatMap((l) =>
    l.steps.map((s, i) => ({
      id: s.id,
      layer: l.position,
      layerName: l.name,
      text: s.text,
      brush: l.brush,
      plate: l.plate,
      tip: l.tip,
      drySeconds: i === l.steps.length - 1 && l.drySeconds > 0 ? l.drySeconds : undefined,
    })),
  );
}

// ── Admin: guide editor (AdminGuideEditor) ───────────────────────────────────

export interface GuideVersionInfo {
  version: number;
  publishedAt: string;
  publishedBy: string | null;
}

export interface GuideEditorData {
  /** What buyers read now. */
  published: Guide;
  /** Autosaved draft, or the published content when nothing changed. */
  draft: GuideContent;
  hasChanges: boolean;
  savedAt: string | null;
  versions: GuideVersionInfo[];
}

interface DraftPatch {
  id: string;
  content: GuideContent | null;
  savedAt: string | null;
}

/** The editor's draft of a guide (sync: the admin actions build on it). */
export function guideDraftContent(guideId: string): GuideContent | null {
  const row = guides.find((g) => g.id === guideId);
  if (!row) return null;
  const draft = patched<DraftPatch>("guide_drafts", { id: guideId, content: null, savedAt: null });
  return clone(draft.content ?? publishedContent(guideRow(row)).content);
}

/** Next version number of a guide (sync, for `publishGuide`). */
export function nextGuideVersion(guideId: string): number {
  const row = guides.find((g) => g.id === guideId);
  return Math.max(row ? guideRow(row).currentVersion : 0, ...versionsOf(guideId).map((v) => v.version)) + 1;
}

export async function getGuideEditor(guideId: string): Promise<GuideEditorData | null> {
  const row = guides.find((g) => g.id === guideId);
  if (!row) return null;
  const published = mapGuide(row);
  const draft = patched<DraftPatch>("guide_drafts", { id: guideId, content: null, savedAt: null });
  const versions = versionsOf(guideId).map((v) => ({ version: v.version, publishedAt: v.publishedAt, publishedBy: v.publishedBy ?? null }));
  const current = publishedContent(guideRow(row));
  return clone({
    published,
    draft: draft.content ?? current.content,
    hasChanges: !!draft.content && JSON.stringify(draft.content.layers) !== JSON.stringify(current.content.layers),
    savedAt: draft.savedAt,
    versions: versions.length ? versions : [{ version: published.version, publishedAt: "2026-09-01T09:00:00Z", publishedBy: null }],
  });
}

/** Static params of /admin/works/[slug]/guide/[guideId]: every guide of every work. */
export async function getGuideEditorParams(): Promise<Array<{ slug: string; guideId: string }>> {
  return guides.map((g) => ({ slug: works.find((w) => w.id === g.workId)!.slug, guideId: g.id }));
}

/** The guides of a work (editor header, work editor links), newest formats first as in FORMATS. */
export async function getWorkGuides(workId: string): Promise<Array<{ id: string; format: FormatKey; level: LevelKey; label: string; version: number }>> {
  const work = works.find((w) => w.id === workId);
  return clone(
    guides
      .filter((g) => g.workId === workId)
      .map(guideRow)
      .map((g) => ({ id: g.id, format: g.format, level: g.level, label: `${formatLabel(g.format, work?.orientation)} · ${LEVELS[g.level].label}`, version: g.currentVersion })),
  );
}
