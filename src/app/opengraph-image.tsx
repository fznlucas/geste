/** The site's link preview: BrandFavicon's layout with the Home hero work (the board draws the work one only). */
import { getHomeHeroWork, getWorks } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { OG_SIZE, linkPreview } from "@/lib/og";

export const dynamic = "force-static";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Geste — Paint it yourself";

export default async function Image() {
  const [hero, works] = await Promise.all([getHomeHeroWork(), getWorks()]);
  const from = Math.min(...works.map((w) => w.minPriceCents));
  return linkPreview({ title: "Paint it yourself", detail: `Step-by-step painting guides · from ${formatPrice(from)}`, imageUrl: hero!.imageUrl });
}
