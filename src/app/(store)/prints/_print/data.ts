/** Data of the print pages: the /prints gallery and /prints/[slug] (boards Print, MPrint). */
import { getEditions, getWork, getWorks, type CatalogWork, type PrintEdition } from "@/lib/api";
import { PRINT_SIZE_ORDER, PRINT_WITH_GUIDE, type Orientation, type PrintSize } from "@/lib/pricing";

export interface PrintPageData {
  work: CatalogWork;
  editions: PrintEdition[];
  /** "Other editions": other works' S edition, cheapest open price per work ("from $55"). */
  others: Array<{ slug: string; number: string; imageUrl: string; orientation: Orientation; fromCents: number; note: string; editionSize: number }>;
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
    return { slug: s, number: first.workNumber, imageUrl: first.imageUrl, orientation: first.orientation, fromCents: Math.min(...own.map((e) => e.priceCents)), note: `${first.nextNumber}/${first.editionSize}`, editionSize: first.editionSize };
  });
  return { work, editions, others };
}

export interface GalleryWork {
  workId: string;
  slug: string;
  number: string;
  imageUrl: string;
  orientation: Orientation;
  /** Edition size of the smallest size on sale ("Edition of 100" on the sheet). */
  editionSize: number;
  /** S, M, L that the work sells, in order. */
  sizes: Array<{ size: PrintSize; soldOut: boolean }>;
  /** Cheapest size with copies left; null when every size is sold out. */
  fromCents: number | null;
  soldOut: boolean;
}

/**
 * One card per live work that sells prints, for the /prints gallery: catalog order, a work goes
 * last only when its three sizes are sold out (docs/decisions.md "Print gallery").
 */
export async function getPrintGallery(): Promise<GalleryWork[]> {
  const [works, editions] = await Promise.all([getWorks(), getEditions()]);
  return works
    .map((w): GalleryWork | null => {
      const own = PRINT_SIZE_ORDER.map((z) => editions.find((e) => e.workId === w.id && e.size === z)).filter((e) => e !== undefined);
      if (own.length === 0) return null;
      const open = own.filter((e) => !e.soldOut);
      return {
        workId: w.id,
        slug: w.slug,
        number: w.number,
        imageUrl: w.imageUrl,
        orientation: w.orientation,
        editionSize: (open[0] ?? own[0]!).editionSize,
        sizes: own.map((e) => ({ size: e.size, soldOut: e.soldOut })),
        fromCents: open.length ? Math.min(...open.map((e) => e.priceCents)) : null,
        soldOut: open.length === 0,
      };
    })
    .filter((w) => w !== null)
    .sort((a, b) => Number(a.soldOut) - Number(b.soldOut));
}
