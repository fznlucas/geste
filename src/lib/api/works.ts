/**
 * Catalog queries. Mock implementation over `src/data`; the signatures are the contract the pages
 * use and will stay the same on Supabase. Isomorphic: callable from server and client components.
 */
import { asset } from "@/lib/asset";
import { CANVASES, LEVELS, PRINT_SIZES, PRINT_SIZE_ORDER, canvasCm, defaultLevel, estimatedTime, formatLabel, formatsOf, guidePriceCents, imageRatio, printCm, quantityLabel, type FormatKey, type LevelKey, type Orientation, type PrintSize, type Proportion, type QuantityKind, type WorkPricing } from "@/lib/pricing";
import type { Palette as ConfiguratorPalette, Work as WorkCardData } from "@/lib/types";
import { orders } from "@/data/orders";
import { guides } from "@/data/guides";
import type { WorkRow } from "@/data/types";
import { HISTORICAL_SALES, HOME_HERO_WORK, palettes, shoppingItems, workFormats, works } from "@/data/works";
import { clone } from "./clone";
import { getGuideEditor } from "./guides";
import { allCustomers, allOrders, allPrintEditions, allReviews, allWorks, inserted, localSoldCount, patched } from "./local";
import type { CatalogWork, GuideOutlineStep, PaletteKey, ShoppingListLine, WorkFormat, WorkStatus, WorksQuery } from "./types";

/** What the price of a work's guide depends on: its Signature flag and its own format prices. */
export function workPricing(row: Pick<WorkRow, "id" | "signature">): WorkPricing {
  return {
    signature: row.signature,
    formatCents: Object.fromEntries(workFormats.filter((f) => f.workId === row.id).map((f) => [f.format, f.guidePriceCents])),
  };
}

/** Cheapest guide of a work: its cheapest active format ("from $15"; a Signature work from $21). */
export function minGuidePriceCents(workId: string): number {
  const row = works.find((w) => w.id === workId)!;
  const pricing = workPricing(row);
  return Math.min(...workFormats.filter((f) => f.workId === workId && f.active).map((f) => guidePriceCents(f.format, pricing)));
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
  const sold = orders
    .filter((o) => o.status !== "refunded" && o.status !== "cancelled")
    .flatMap((o) => o.items)
    .filter((i) => i.kind === "guide" && i.workId === row.id).length;
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
    formats,
    palettes: palettes
      .filter((p) => p.workId === row.id && p.active)
      .map((p) => ({ key: p.key, name: p.name, swatches: p.swatches, previewFilter: p.previewFilter })),
    fromPriceCents: card.priceCents,
    minPriceCents: minGuidePriceCents(row.id),
    levelLabel: card.levelLabel,
    duration: card.duration,
    soldCount: (HISTORICAL_SALES[row.slug] ?? 0) + sold,
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
  orientation: Orientation;
  signature: boolean;
  formatLabel: string;
  levelLabel: string;
  soldCount: number;
  /** Created in the admin (no prebuilt editor page in the static export). */
  isDraftCreated: boolean;
  /** Where its editor lives: /admin/works/n03 or /admin/works/draft?slug=n16 */
  editorHref: string;
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
  const sold = allOrders()
    .filter((o) => o.status !== "refunded" && o.status !== "cancelled")
    .flatMap((o) => o.items)
    .filter((i) => i.kind === "guide" && i.workId === row.id).length;
  const isDraftCreated = createdIds.has(row.id);
  return {
    id: row.id,
    number: row.number,
    slug: row.slug,
    status: row.status,
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
    orientation: row.orientation ?? "portrait",
    signature: !!row.signature,
    formatLabel: formatLabel(defaultFormat, row.orientation ?? "portrait"),
    levelLabel: LEVELS[baseLevel].label,
    soldCount: (HISTORICAL_SALES[row.slug] ?? 0) + sold,
    isDraftCreated,
    editorHref: isDraftCreated ? `/admin/works/draft?slug=${row.slug}` : `/admin/works/${row.slug}`,
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
      ? { size, dimensions, editionId: e.id, editionSize: e.editionSize, priceCents: e.priceCents, open: e.open, sold: e.soldCount + localSoldCount(e.id) }
      : { size, dimensions, editionId: null, editionSize: PRINT_SIZES[size].editionSize, priceCents: PRINT_SIZES[size].priceCents, open: false, sold: 0 };
  });

  const guideRow = guides.find((g) => g.workId === row.id && g.format === work.defaultFormat && g.level === def.defaultLevel);
  const editor = guideRow ? await getGuideEditor(guideRow.id) : null;
  const guide = guideRow && editor && editor.published.version > 0
    ? {
        id: guideRow.id,
        layers: editor.published.layers.length,
        steps: editor.published.stepCount,
        version: editor.published.version,
        editedAt: editor.savedAt ?? editor.versions[0]!.publishedAt,
      }
    : null;

  const checklist: AdminChecklistItem[] = [
    { key: "preview", label: work.imageUrl ? "Preview image" : "Preview image missing", done: !!work.imageUrl },
    { key: "guide", label: guide ? `Guide: ${guide.steps} steps` : "Guide missing", done: !!guide },
    { key: "studio", label: work.studioTested ? "Painted by the studio" : "Not painted by the studio", done: work.studioTested },
    { key: "result", label: work.resultPhotoUrl ? "Real result photo" : "Real result photo missing", done: !!work.resultPhotoUrl },
    { key: "list", label: shoppingList.length && shoppingList.every((i) => i.url) ? "Shopping list links" : "Shopping list links missing", done: shoppingList.length > 0 && shoppingList.every((i) => i.url) },
  ];

  const resultCandidates = allReviews()
    .filter((r) => r.workId === row.id && r.photoPath && (r.status === "published" || r.status === "featured"))
    .map((r) => ({ reviewId: r.id, photoPath: r.photoPath!, photoUrl: asset(r.photoPath!), customerName: allCustomers().find((c) => c.id === r.userId)?.fullName ?? "" }));

  return clone({ ...work, formats, palettes: workPalettes, shoppingList, editions, guide, checklist, resultCandidates });
}

/** Static params of the work editor: the works of the mock (drafts created in the admin use /admin/works/draft?slug=). */
export async function getWorkSlugs(): Promise<string[]> {
  return works.map((w) => w.slug);
}
