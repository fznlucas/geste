/** Data of a print page (boards Print, MPrint), shared by /prints and /prints/[slug]. */
import { getEditions, getWork, type CatalogWork, type PrintEdition } from "@/lib/api";

export interface PrintPageData {
  work: CatalogWork;
  editions: PrintEdition[];
  /** "Other editions": other works' A3, cheapest open price per work ("from $45"). */
  others: Array<{ slug: string; number: string; imageUrl: string; fromCents: number; note: string }>;
}

/** Works that sell prints, in the editions' order (N°07 first: the Home and /prints lead with it). */
export async function printSlugs(): Promise<string[]> {
  return [...new Set((await getEditions({ includeClosed: true })).map((e) => e.workSlug))];
}

export async function getPrintPage(slug: string): Promise<PrintPageData | null> {
  const work = await getWork(slug);
  if (!work) return null;
  const all = await getEditions();
  const editions = all.filter((e) => e.workId === work.id);
  if (editions.length === 0) return null;
  const others = [...new Set(all.filter((e) => e.workId !== work.id && e.size === "A3" && !e.soldOut).map((e) => e.workSlug))].slice(0, 4).map((s) => {
    const own = all.filter((e) => e.workSlug === s && !e.soldOut);
    const a3 = own.find((e) => e.size === "A3")!;
    return { slug: s, number: a3.workNumber, imageUrl: a3.imageUrl, fromCents: Math.min(...own.map((e) => e.priceCents)), note: `${a3.nextNumber}/${a3.editionSize}` };
  });
  return { work, editions, others };
}
