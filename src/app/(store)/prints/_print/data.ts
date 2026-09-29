/** Data of the print pages: the /prints gallery and /prints/[slug] (boards Print, MPrint). */
import { getEditions, getWork, getWorks, type CatalogWork, type PrintEdition } from "@/lib/api";
import { PRINT_SIZE_ORDER, PRINT_WITH_GUIDE, type Orientation, type PrintSize } from "@/lib/pricing";

export interface PrintPageData {
  work: CatalogWork;
  editions: PrintEdition[];
  /** "Other editions": other works' S edition, cheapest open price per work ("from $55"). */
  others: Array<{ slug: string; number: string; imageUrl: string; orientation: Orientation; fromCents: number; note: string }>;
}

/** Works that sell prints, in the editions' order (N°07 first: the Home leads with it). */
export async function printSlugs(): Promise<string[]> {
  return [...new Set((await getEditions({ includeClosed: true })).map((e) => e.workSlug))];
}

export async function getPrintPage(slug: string): Promise<PrintPageData | null> {
  const work = await getWork(slug);
  if (!work) return null;
  const all = await getEditions();
  const editions = all.filter((e) => e.workId === work.id);
  if (editions.length === 0) return null;
  const others = [...new Set(all.filter((e) => e.workId !== work.id && e.size === PRINT_WITH_GUIDE && !e.soldOut).map((e) => e.workSlug))].slice(0, 4).map((s) => {
    const own = all.filter((e) => e.workSlug === s && !e.soldOut);
    const first = own.find((e) => e.size === PRINT_WITH_GUIDE)!;
    return { slug: s, number: first.workNumber, imageUrl: first.imageUrl, orientation: first.orientation, fromCents: Math.min(...own.map((e) => e.priceCents)), note: `${first.nextNumber}/${first.editionSize}` };
  });
  return { work, editions, others };
}

export interface GalleryEdition {
  id: string;
  href: string;
  imageUrl: string;
  orientation: Orientation;
  workNumber: string;
  size: PrintSize;
  /** "12/100", null when sold out */
  next: string | null;
  priceCents: number;
  soldOut: boolean;
}

/**
 * Every open edition of the live works, for the /prints gallery: S, then M, then L, each in catalog
 * order; sold-out editions last (docs/decisions.md "Print gallery").
 */
export async function getPrintGallery(): Promise<GalleryEdition[]> {
  const [works, editions] = await Promise.all([getWorks(), getEditions()]);
  const order = new Map(works.map((w) => [w.id, w.sortOrder]));
  return editions
    .filter((e) => order.has(e.workId))
    .sort((a, b) => Number(a.soldOut) - Number(b.soldOut) || PRINT_SIZE_ORDER.indexOf(a.size) - PRINT_SIZE_ORDER.indexOf(b.size) || order.get(a.workId)! - order.get(b.workId)!)
    .map((e) => ({
      id: e.id,
      href: `/prints/${e.workSlug}?size=${e.size.toLowerCase()}`,
      imageUrl: e.imageUrl,
      orientation: e.orientation,
      workNumber: e.workNumber,
      size: e.size,
      next: e.nextNumber === null ? null : `${e.nextNumber}/${e.editionSize}`,
      priceCents: e.priceCents,
      soldOut: e.soldOut,
    }));
}
