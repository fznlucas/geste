/** Work page — boards Product, Product01–15, MProduct, docs/screens/store.md §Work page. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEditions, getGuideOutline, getWork, getWorks, type GuideOutlineStep, type LevelKey } from "@/lib/api";
import { LEVELS, guidePriceCents } from "@/lib/pricing";
import { WorkPage } from "./WorkPage";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getWorks()).map((w) => ({ slug: w.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const work = await getWork((await params).slug);
  if (!work) return {};
  return { title: { absolute: work.seoTitle }, description: work.seoDescription };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const work = await getWork(slug);
  if (!work) notFound();

  // The print option is the work's A3 edition, if it still has copies.
  const a3 = (await getEditions({ workId: work.id })).find((e) => e.size === "A3" && !e.soldOut) ?? null;

  // Outline of every level × palette, so the accordion follows the configurator without a request.
  const outlines: Record<string, GuideOutlineStep[]> = {};
  for (const level of Object.keys(LEVELS) as LevelKey[]) {
    for (const p of work.palettes) outlines[`${level}:${p.key}`] = await getGuideOutline(work.id, level, p.key);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${work.number} — step-by-step painting guide`,
    description: work.seoDescription,
    image: new URL(work.imageUrl, "https://geste.studio").toString(),
    brand: { "@type": "Brand", name: "Geste" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: (work.minPriceCents / 100).toFixed(2),
      highPrice: (Math.max(...work.formats.filter((f) => f.active).map((f) => guidePriceCents({ format: f.format, level: "advanced", palette: "original" }))) / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* The configuration lives in the URL (read in the browser); the fallback is the default configuration. */}
      <Suspense fallback={<WorkPage work={work} a3={a3} outlines={outlines} static />}>
        <WorkPage work={work} a3={a3} outlines={outlines} />
      </Suspense>
    </>
  );
}
