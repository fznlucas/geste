/** Link preview of a work (BrandFavicon): "N°03" · "Intermediate · 60×80 · from $15" · the work (whole when landscape). */
import { getWork, getWorks } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { OG_SIZE, linkPreview } from "@/lib/og";

export const dynamic = "force-static";
export const dynamicParams = false;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A Geste painting guide: the work, its level, format and price";

export async function generateStaticParams() {
  return (await getWorks()).map((w) => ({ slug: w.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const work = (await getWork((await params).slug))!;
  const card = work.formats.find((f) => f.format === work.defaultFormat)!;
  return linkPreview({ title: work.number, detail: `${card.levelLabel} · ${card.label} · from ${formatPrice(work.minPriceCents)}`, imageUrl: work.imageUrl, orientation: work.orientation });
}
