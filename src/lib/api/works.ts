/**
 * Catalog queries. Mock implementation over `src/data`; the signatures are the contract the pages
 * use and will stay the same on Supabase. Isomorphic: callable from server and client components.
 */
import { asset } from "@/lib/asset";
import { FORMATS, LEVELS, estimatedTime, guidePriceCents, type FormatKey } from "@/lib/pricing";
import type { Palette as ConfiguratorPalette, Work as WorkCardData } from "@/lib/types";
import { orders } from "@/data/orders";
import type { WorkRow } from "@/data/types";
import { HISTORICAL_SALES, HOME_HERO_WORK, palettes, shoppingItems, workFormats, works } from "@/data/works";
import { clone } from "./clone";
import type { CatalogWork, ShoppingListLine, WorkFormat, WorksQuery } from "./types";

export function mapWork(row: WorkRow): CatalogWork {
  const formats: WorkFormat[] = workFormats
    .filter((f) => f.workId === row.id)
    .map((f) => ({
      format: f.format,
      label: FORMATS[f.format].label,
      defaultLevel: f.defaultLevel,
      levelLabel: LEVELS[f.defaultLevel].label,
      layers: LEVELS[f.defaultLevel].layers,
      priceCents: guidePriceCents({ format: f.format, level: "match", palette: "original" }),
      duration: estimatedTime({ format: f.format, level: "match", palette: "original" }),
      active: f.active,
    }));
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
    resultPhotoUrl: row.resultPhotoPath ? asset(row.resultPhotoPath) : null,
    studioTested: row.studioTested,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    sortOrder: row.sortOrder,
    defaultFormat: row.defaultFormat,
    formats,
    palettes: palettes
      .filter((p) => p.workId === row.id && p.active)
      .map((p) => ({ key: p.key, name: p.name, swatches: p.swatches, previewFilter: p.previewFilter })),
    fromPriceCents: card.priceCents,
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
      .filter((w) => !query.level || FORMATS[w.defaultFormat].defaultLevel === query.level)
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

/** Shopping list of a work, quantities scaled to the format. */
export async function getShoppingList(workId: string, format: FormatKey): Promise<ShoppingListLine[]> {
  return clone(
    shoppingItems
      .filter((i) => i.workId === workId)
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        position: i.position,
        name: i.name,
        quantity: i.quantityRule[format],
        standard: { label: i.standardLabel, priceCents: i.standardCents, url: i.standardUrl },
        budget: { label: i.budgetLabel, priceCents: i.budgetCents, url: i.budgetUrl },
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
