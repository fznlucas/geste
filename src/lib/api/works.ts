/**
 * Catalog queries. Mock implementation over `src/data`; the signatures are the contract the pages
 * use and will stay the same on Supabase. Isomorphic: callable from server and client components.
 */
import { asset } from "@/lib/asset";
import { CANVASES, LEVELS, LEVEL_ORDER, canvasArea, PRINT_SIZES, PRINT_SIZE_ORDER, canvasCm, defaultLevel, estimatedTime, formatLabel, formatsOf, guidePriceCents, imageRatio, printCm, quantityLabel, type FormatKey, type LevelKey, type Orientation, type PrintSize, type Proportion, type QuantityKind } from "@/lib/pricing";
import type { Palette as ConfiguratorPalette, Work as WorkCardData } from "@/lib/types";
import { guides } from "@/data/guides";
import type { GuideVersionContent, WorkRow } from "@/data/types";
import { HOME_HERO_WORK, palettes, shoppingItems, workFormats, works } from "@/data/works";
import { simNow } from "@/lib/clock";
import { clone } from "./clone";
import { getGuideEditor, mapGuide } from "./guides";
import { allCustomers, allOrders, allPrintEditions, allReviews, allWorks, editionSoldCount, inserted, patched } from "./local";
import type { CatalogWork, GuideOutlineStep, PaletteKey, ShoppingListLine, WorkFormat, WorkStatus, WorksQuery } from "./types";

import { minGuidePriceCents, workPricing } from "./price-lines";

export { minGuidePriceCents, workPricing };

/** All-time guides sold per work, every source (refunded and cancelled orders left out). */
let soldMemo: { orders: ReturnType<typeof allOrders>; counts: Map<string, number> } | null = null;
function guidesSold(): Map<string, number> {
  const orders = allOrders();
  if (soldMemo?.orders === orders) return soldMemo.counts;
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "refunded" || o.status === "cancelled" || o.status === "pending") continue;
    for (const i of o.items) if (i.kind === "guide" && i.workId) counts.set(i.workId, (counts.get(i.workId) ?? 0) + 1);
  }
  soldMemo = { orders, counts };
  return counts;
}

export function mapWork(row: WorkRow): CatalogWork {
  const pricing = workPricing(row);
  const formats: WorkFormat[] = formatsOf(row.proportion)
    .map((format) => workFormats.find((f) => f.workId === row.id && f.format === format))
    .filter((f) => f !== undefined)
    .map((f) => {
      const level = defaultLevel(f.format, row.baseLevel);
      return {
        format: f.format,
        label: formatLabel(f.format, row.orientation),
        cm: canvasCm(f.format, row.orientation),
        defaultLevel: level,
        levelLabel: LEVELS[level].label,
        layers: LEVELS[level].layers,
        priceCents: guidePriceCents(f.format, pricing),
        duration: estimatedTime(f.format, level),
        active: f.active,
      };
    });
  const card = formats.find((f) => f.format === row.defaultFormat)!;
  const sold = guidesSold().get(row.id) ?? 0;
  return {
    id: row.id,
    number: row.number,
    slug: row.slug,
    status: row.status,
    publishAt: row.publishAt,
    description: row.description,
    imageUrl: asset(row.previewPath),
    imageAlt: `${row.number} · Digital preview`,
    orientation: row.orientation,
    imageRatio: imageRatio(row),
    signature: row.signature,
    resultPhotoUrl: row.resultPhotoPath ? asset(row.resultPhotoPath) : null,
    studioTested: row.studioTested,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    sortOrder: row.sortOrder,
    defaultFormat: row.defaultFormat,
    proportion: row.proportion,
    baseLevel: row.baseLevel,
    originalSize: row.originalSize,
    originalArea: canvasArea(row.originalSize),
    formats,
    palettes: palettes
      .filter((p) => p.workId === row.id && p.active)
      .map((p) => ({ key: p.key, name: p.name, swatches: p.swatches, previewFilter: p.previewFilter })),
    fromPriceCents: card.priceCents,
    minPriceCents: minGuidePriceCents(row.id),
    levelLabel: card.levelLabel,
    duration: card.duration,
    soldCount: sold,
  };
}

/** Works ordered by `sort_order`. Store default: live works only. */
export async function getWorks(query: WorksQuery = {}): Promise<CatalogWork[]> {
  const status = query.status ?? "live";
  return clone(
    works
      .filter((w) => status === "all" || w.status === status)
      .map(mapWork)
      .filter((w) => !query.level || w.baseLevel === query.level)
      .filter((w) => !query.palette || w.palettes.some((p) => p.key === query.palette))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );
}

/** Store work page. Returns null for unknown or unpublished works (→ notFound()). */
export async function getWork(slug: string): Promise<CatalogWork | null> {
  const row = works.find((w) => w.slug === slug && w.status === "live");
  return row ? clone(mapWork(row)) : null;
}

/** Admin: any status. */
export async function getWorkById(id: string): Promise<CatalogWork | null> {
  const row = works.find((w) => w.id === id);
  return row ? clone(mapWork(row)) : null;
}

/** Hero of the home page (`site_settings.home.hero_work`). */
export async function getHomeHeroWork(): Promise<CatalogWork | null> {
  return getWork(HOME_HERO_WORK);
}

/** Shopping list of a work (board ShoppingList), quantities scaled to the canvas's surface. */
export async function getShoppingList(workId: string, format: FormatKey): Promise<ShoppingListLine[]> {
  const orientation = works.find((w) => w.id === workId)?.orientation ?? "portrait";
  const fill = (label: string, kind: QuantityKind | null) => (kind ? label.replace("{q}", quantityLabel(kind, format, orientation)) : label);
  return clone(
    shoppingItems
      .filter((i) => i.workId === workId)
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        position: i.position,
        name: i.name,
        standard: { label: fill(i.standardLabel, i.quantityKind), priceCents: i.standardCents, url: i.standardUrl },
        budget: { label: fill(i.budgetLabel, i.quantityKind), priceCents: i.budgetCents, url: i.budgetUrl },
      })),
  );
}

/** Props for <WorkCard>. */
export function toWorkCard(work: CatalogWork): WorkCardData {
  return {
    id: work.id,
    number: work.number,
    slug: work.slug,
    imageUrl: work.imageUrl,
    imageAlt: work.imageAlt,
    orientation: work.orientation,
    imageRatio: work.imageRatio,
    signature: work.signature,
    fromPriceCents: work.fromPriceCents,
    defaultFormat: work.defaultFormat,
    originalArea: work.originalArea,
    levelLabel: work.levelLabel,
    duration: work.duration,
  };
}

/** Props for <GuideConfigurator palettes>. */
export function toConfiguratorPalettes(work: CatalogWork): ConfiguratorPalette[] {
  return work.palettes.map((p) => ({ id: p.key, name: p.name, swatches: p.swatches.map((s) => s.hex) }));
}

/**
 * Outline of the guide for the work page accordion, worded with the palette's colour names.
 * Mock: the wording of the Product / MProduct boards; later it is derived from the published
 * guide version (one line per layer).
 */
export async function getGuideOutline(workId: string, level: LevelKey, palette: PaletteKey): Promise<GuideOutlineStep[]> {
  const p = palettes.find((x) => x.workId === workId && x.key === palette) ?? palettes.find((x) => x.workId === workId && x.key === "original")!;
  const [c0, c1, c2, c3] = p.swatches.map((s) => s.name) as [string, string, string, string];
  const underlayer = { text: `Underlayer. Thin patches of ${c2} and ${c3}. Let dry.`, short: `Underlayer: thin patches of ${c2} and ${c3}.` };
  const lines: Record<LevelKey, Array<{ text: string; short: string }>> = {
    beginner: [
      { text: `Underlayer. Thin, loose patches of ${c2} and ${c3}. Leave white canvas showing. Let dry.`, short: underlayer.short },
      { text: `Gestures. Fast, wide strokes of ${c0} and ${c1}, mostly horizontal.`, short: `Gestures: wide strokes of ${c0} and ${c1}.` },
      { text: "Stop earlier than you think. Sign.", short: "Stop earlier than you think. Sign." },
    ],
    intermediate: [
      underlayer,
      { text: `Gestures. Wide strokes of ${c0} and ${c1}. Let dry.`, short: `Gestures: wide strokes of ${c0} and ${c1}.` },
      { text: `Veils. ${c0} mixed with white, dragged semi-opaque on top.`, short: `Veils: ${c0} with white, semi-opaque.` },
      { text: "Stop earlier than you think. Sign.", short: "Stop earlier than you think. Sign." },
    ],
    advanced: [
      underlayer,
      { text: `Gestures. Wide strokes of ${c0} and ${c1}.`, short: `Gestures: wide strokes of ${c0} and ${c1}.` },
      { text: `Drips. Thin ${c1} with water, let it run.`, short: `Drips: thinned ${c1}.` },
      { text: `Knife. Scrape and drag ${c2} across the wet layer.`, short: `Knife: drag ${c2} across.` },
      { text: `Veils. ${c0} mixed with white, semi-opaque.`, short: `Veils: ${c0} with white.` },
      { text: "Stop earlier than you think. Sign.", short: "Stop. Sign." },
    ],
  };
  return lines[level].map((l, i) => ({ n: String(i + 1).padStart(2, "0"), ...l }));
}

// ── Admin (AdminCatalog, AdminWorkEditor) ───────────────────────────────────
// Reads through the admin overlay (`allWorks`, `patched`): the admin sees its own edits and the
// drafts it created. The store functions above read the mock tables as built, like the deployed site.

/** How a palette's preview is tinted, in words (Palettes tab). */
const FILTER_NOTE: Record<PaletteKey, string> = { original: "Tubes: 4 + white", warm: "Preview filter: warm", cool: "Preview filter: hue 150°", earth: "Preview filter: sepia" };

/** Row ids of the tables without their own id in the mock (overlay keys). */
export const formatRowId = (workId: string, format: FormatKey) => `${workId}:${format}`;
export const paletteRowId = (workId: string, key: PaletteKey) => `${workId}:${key}`;
export const listRowId = (workId: string, position: number) => `${workId}:${position}`;

export interface AdminWorkFormat {
  format: FormatKey;
  /** "60×80", "80×60" for a landscape work. */
  label: string;
  /** Set by the size and the work's base level (pricing.ts defaultLevel), not stored. */
  defaultLevel: LevelKey;
  /** Stored guide price for any level (`work_formats.guide_price_cents`), before the Signature supplement. */
  priceCents: number;
  /** "~3h30" at the default level */
  duration: string;
  active: boolean;
}

export interface AdminWorkPalette {
  key: PaletteKey;
  name: string;
  swatches: Array<{ hex: string; name: string }>;
  /** "Tubes: 4 + white", "Preview filter: warm" */
  note: string;
  active: boolean;
}

export interface AdminListItem {
  id: string;
  position: number;
  /** "Canvas 60 × 80 cm", "Turquoise 60 ml" at the default format */
  name: string;
  /** "Primed cotton canvas 60 × 80 cm, stretched / Unprimed roll + 4 stretcher bars" */
  choices: string;
  standardCents: number;
  budgetCents: number;
  url: string;
}

export interface AdminWorkEdition {
  size: PrintSize;
  /** "30 × 42 cm", turned for a landscape work. */
  dimensions: string;
  editionId: string | null;
  editionSize: number;
  priceCents: number;
  /** On sale (an open edition exists). */
  open: boolean;
  sold: number;
}

export interface AdminChecklistItem {
  key: "preview" | "guide" | "studio" | "result" | "list";
  /** "Guide: 15 steps", "Real result photo missing" */
  label: string;
  done: boolean;
}

export interface AdminWork {
  id: string;
  number: string;
  slug: string;
  status: WorkStatus;
  publishAt: string | null;
  description: string;
  /** null for a new draft without a preview yet */
  imageUrl: string | null;
  resultPhotoUrl: string | null;
  studioTested: boolean;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  defaultFormat: FormatKey;
  proportion: Proportion;
  baseLevel: LevelKey;
  /** Reference canvas of the grids (General tab) and its surface in cm². */
  originalSize: FormatKey;
  originalArea: number;
  /** Width / height of the preview (4:5, 5:4 landscape, before it is uploaded). */
  imageRatio: number;
  orientation: Orientation;
  signature: boolean;
  formatLabel: string;
  levelLabel: string;
  soldCount: number;
  /** Created in the admin (no prebuilt editor page in the static export). */
  isDraftCreated: boolean;
  /** Where its editor lives: /admin/works/n03 or /admin/works/draft?slug=n16 */
  editorHref: string;
  /** What the checklist still misses (empty: it can go live). */
  missing: string[];
}

export interface AdminWorkDetail extends AdminWork {
  formats: AdminWorkFormat[];
  palettes: AdminWorkPalette[];
  shoppingList: AdminListItem[];
  editions: AdminWorkEdition[];
  guide: { id: string; layers: number; steps: number; version: number; editedAt: string } | null;
  checklist: AdminChecklistItem[];
  /** Published review photos of this work: "Pick from submitted results". */
  resultCandidates: Array<{ reviewId: string; photoPath: string; photoUrl: string; customerName: string }>;
}

/**
 * "Before going live" (docs/admin-v2/05 "Catalog and guides"): one checklist for the status chips, the
 * tabs, the Live and Scheduled guards and the hero picker. Every guide of the work's three canvases ×
 * three levels published with all its layers, the preview, the studio's own painting, a real result
 * photo, shopping-list links.
 */
export function workChecklist(workId: string): AdminChecklistItem[] {
  const row = allWorks().find((w) => w.id === workId);
  if (!row) return [];
  const proportion = row.proportion ?? DRAFT_PROPORTION;
  const expected = formatsOf(proportion).flatMap((format) => LEVEL_ORDER.map((level) => ({ format, level })));
  const published = expected.filter(({ format, level }) => {
    const g = guides.find((x) => x.workId === workId && x.format === format && x.level === level);
    if (!g) return false;
    const m = mapGuide(g);
    // Published, every layer written (the mock's stand-in guides reuse N°03's layers: docs/decisions.md).
    return m.version > 0 && m.layers.length > 0 && m.layers.every((l) => l.steps.length > 0);
  });
  const list = shoppingItems.filter((i) => i.workId === workId).map((i) => patched("shopping_items", { id: listRowId(workId, i.position), url: i.standardUrl }));
  const steps = published.length ? mapGuide(guides.find((x) => x.workId === workId && x.format === published[0]!.format && x.level === published[0]!.level)!).stepCount : 0;
  const allGuides = published.length === expected.length;
  return [
    { key: "preview", label: row.previewPath ? "Preview image" : "Preview image missing", done: !!row.previewPath },
    { key: "guide", label: allGuides ? `Guides: ${expected.length} published${steps ? ` · ${steps} steps` : ""}` : published.length ? `Guides: ${expected.length - published.length} of ${expected.length} missing` : aiGuideDraft(workId) ? "Guide drafted from the AI plan, not published" : "Guide missing", done: allGuides },
    { key: "studio", label: row.studioTested ? "Painted by the studio" : "Not painted by the studio", done: !!row.studioTested },
    { key: "result", label: row.resultPhotoPath ? "Real result photo" : "Real result photo missing", done: !!row.resultPhotoPath },
    { key: "list", label: list.length && list.every((i) => i.url) ? "Shopping list links" : "Shopping list links missing", done: list.length > 0 && list.every((i) => i.url) },
  ];
}

/**
 * A scheduled work goes live at its time (the clock), if the checklist still passes; otherwise it stays
 * scheduled, past its date, and an alert says why (`overdueSchedules`). The store pages are built ahead
 * of time and follow at the next build.
 */
export function workStatusNow(row: Pick<WorkRow, "id" | "status" | "publishAt">): WorkStatus {
  if (row.status !== "scheduled" || !row.publishAt || Date.parse(row.publishAt) > simNow().getTime()) return row.status;
  const checklist = workChecklist(row.id);
  return checklist.length > 0 && checklist.every((c) => c.done) ? "live" : "scheduled";
}

/** Scheduled works past their time that could not go live, with what they miss. */
export function overdueSchedules(): Array<{ id: string; number: string; href: string; publishAt: string; missing: string[] }> {
  const now = simNow().getTime();
  const created = createdWorkIds();
  return allWorks()
    .filter((w) => w.status === "scheduled" && w.publishAt && Date.parse(w.publishAt) <= now && workStatusNow(w) === "scheduled")
    .map((w) => ({ id: w.id, number: w.number, href: created.has(w.id) ? `/admin/works/draft?slug=${w.slug}` : `/admin/works/${w.slug}`, publishAt: w.publishAt!, missing: workMissing(w.id) }));
}

/** The guide drafted from an approved AI candidate's stroke plan (version 0: not published). */
export function aiGuideDraft(workId: string): { id: string; content: GuideVersionContent; savedAt: string } | null {
  return inserted<{ id: string; workId: string; content: GuideVersionContent; savedAt: string }>("ai_guide_drafts").find((d) => d.workId === workId) ?? null;
}

/** The checklist's missing items ("Real result photo missing"), empty when the work can go live. */
export const workMissing = (workId: string) => workChecklist(workId).filter((c) => !c.done).map((c) => c.label);

/** A draft created in the admin before its proportion or level is set. */
const DRAFT_PROPORTION: Proportion = "4:5";
const DRAFT_LEVEL: LevelKey = "intermediate";

/** The three canvases of the work's proportion: its own rows, or the defaults (a draft, a proportion just changed). */
const workFormatRows = (workId: string, proportion: Proportion) =>
  formatsOf(proportion).map((format) => {
    const own = workFormats.find((f) => f.workId === workId && f.format === format);
    const row = own ?? { workId, format, guidePriceCents: CANVASES[format].guideCents, estMinutes: 0, active: true };
    return patched("work_formats", { ...row, id: formatRowId(workId, format) });
  });

function adminFormats(workId: string, proportion: Proportion, baseLevel: LevelKey, orientation: Orientation): AdminWorkFormat[] {
  return workFormatRows(workId, proportion).map((f) => {
    const level = defaultLevel(f.format, baseLevel);
    return {
      format: f.format,
      label: formatLabel(f.format, orientation),
      defaultLevel: level,
      priceCents: f.guidePriceCents,
      duration: `~${estimatedTime(f.format, level)}`,
      active: f.active,
    };
  });
}

function mapAdminWork(row: WorkRow, createdIds: Set<string>): AdminWork {
  const proportion = row.proportion ?? DRAFT_PROPORTION;
  const baseLevel = row.baseLevel ?? DRAFT_LEVEL;
  // The medium canvas of the proportion (the stored default may be of the proportion before a change).
  const defaultFormat = formatsOf(proportion)[1]!;
  const originalSize = row.originalSize && formatsOf(proportion).includes(row.originalSize) ? row.originalSize : defaultFormat;
  const sold = allOrders()
    .filter((o) => o.status !== "refunded" && o.status !== "cancelled")
    .flatMap((o) => o.items)
    .filter((i) => i.kind === "guide" && i.workId === row.id).length;
  const isDraftCreated = createdIds.has(row.id);
  return {
    id: row.id,
    number: row.number,
    slug: row.slug,
    status: workStatusNow(row),
    publishAt: row.publishAt,
    description: row.description ?? "",
    imageUrl: row.previewPath ? asset(row.previewPath) : null,
    resultPhotoUrl: row.resultPhotoPath ? asset(row.resultPhotoPath) : null,
    studioTested: !!row.studioTested,
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    sortOrder: row.sortOrder,
    defaultFormat,
    proportion,
    baseLevel,
    originalSize,
    originalArea: canvasArea(originalSize),
    imageRatio: imageRatio(row),
    orientation: row.orientation ?? "portrait",
    signature: !!row.signature,
    formatLabel: formatLabel(defaultFormat, row.orientation ?? "portrait"),
    levelLabel: LEVELS[baseLevel].label,
    soldCount: sold,
    isDraftCreated,
    editorHref: isDraftCreated ? `/admin/works/draft?slug=${row.slug}` : `/admin/works/${row.slug}`,
    missing: workMissing(row.id),
  };
}

const createdWorkIds = () => new Set(inserted<WorkRow>("works").map((w) => w.id));

/** AdminCatalog: every work, any status, in catalog order (drafts created in the admin last). */
export async function getAdminWorks(): Promise<AdminWork[]> {
  const created = createdWorkIds();
  return clone(allWorks().map((w) => mapAdminWork(w, created)).sort((a, b) => a.sortOrder - b.sortOrder));
}

/** AdminWorkEditor. */
export async function getAdminWork(slug: string): Promise<AdminWorkDetail | null> {
  const row = allWorks().find((w) => w.slug === slug);
  if (!row) return null;
  const work = mapAdminWork(row, createdWorkIds());
  const formats = adminFormats(row.id, work.proportion, work.baseLevel, work.orientation);
  const def = formats.find((f) => f.format === work.defaultFormat)!;

  const paletteRows = palettes.filter((p) => p.workId === row.id);
  const workPalettes: AdminWorkPalette[] = (paletteRows.length ? paletteRows : [{ key: "original" as PaletteKey, name: "Original", swatches: palettes[0]!.swatches, active: true }])
    .map((p) => patched("palettes", { id: paletteRowId(row.id, p.key), key: p.key, name: p.name, swatches: p.swatches, note: FILTER_NOTE[p.key], active: p.active }))
    .map(({ id: _id, ...p }) => p);

  const shoppingList: AdminListItem[] = shoppingItems
    .filter((i) => i.workId === row.id)
    .sort((a, b) => a.position - b.position)
    .map((i) => {
      const q = i.quantityKind ? quantityLabel(i.quantityKind, work.defaultFormat, work.orientation) : null;
      const fill = (label: string) => (q ? label.replace("{q}", q) : label);
      const p = patched("shopping_items", { id: listRowId(row.id, i.position), url: i.standardUrl });
      return { id: p.id, position: i.position, name: q ? `${i.name} ${q}` : i.name, choices: `${fill(i.standardLabel)} / ${fill(i.budgetLabel)}`, standardCents: i.standardCents, budgetCents: i.budgetCents, url: p.url };
    });

  const editionRows = allPrintEditions().filter((e) => e.workId === row.id);
  const editions: AdminWorkEdition[] = PRINT_SIZE_ORDER.map((size) => {
    const e = editionRows.find((x) => x.size === size);
    const dimensions = printCm(size, work.orientation);
    return e
      ? { size, dimensions, editionId: e.id, editionSize: e.editionSize, priceCents: e.priceCents, open: e.open, sold: editionSoldCount(e.id) }
      : { size, dimensions, editionId: null, editionSize: PRINT_SIZES[size].editionSize, priceCents: PRINT_SIZES[size].priceCents, open: false, sold: 0 };
  });

  const guideRow = guides.find((g) => g.workId === row.id && g.format === work.defaultFormat && g.level === def.defaultLevel);
  const editor = guideRow ? await getGuideEditor(guideRow.id) : null;
  const aiDraft = aiGuideDraft(row.id);
  const guide = guideRow && editor && editor.published.version > 0
    ? {
        id: guideRow.id,
        layers: editor.published.layers.length,
        steps: editor.published.stepCount,
        version: editor.published.version,
        editedAt: editor.savedAt ?? editor.versions[0]!.publishedAt,
      }
    : aiDraft
      ? { id: aiDraft.id, layers: aiDraft.content.layers.length, steps: aiDraft.content.layers.reduce((n, l) => n + l.steps.length, 0), version: 0, editedAt: aiDraft.savedAt }
      : null;

  const checklist = workChecklist(row.id);

  const resultCandidates = allReviews()
    .filter((r) => r.workId === row.id && r.photoPath && (r.status === "published" || r.status === "featured"))
    .map((r) => ({ reviewId: r.id, photoPath: r.photoPath!, photoUrl: asset(r.photoPath!), customerName: allCustomers().find((c) => c.id === r.userId)?.fullName ?? "" }));

  return clone({ ...work, formats, palettes: workPalettes, shoppingList, editions, guide, checklist, resultCandidates });
}

/** Static params of the work editor: the works of the mock (drafts created in the admin use /admin/works/draft?slug=). */
export async function getWorkSlugs(): Promise<string[]> {
  return works.map((w) => w.slug);
}
