import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getGuide, getGuideEditorParams } from "@/lib/api";
import { GuideEditor } from "./GuideEditor";

/** Every guide of every work (15 × 3 canvases × 3 levels): light client shells, like the reader's pages. */
export async function generateStaticParams({ params }: { params?: { slug?: string } }) {
  return (await getGuideEditorParams()).filter((p) => !params?.slug || p.slug === params.slug);
}
export const dynamicParams = false;

export const metadata: Metadata = { title: "Guide editor" };

/** /admin/works/[slug]/guide/[guideId] (AdminGuideEditor). `?step=2c` or `?layer=2` is read in the browser. */
export default async function Page({ params }: { params: Promise<{ slug: string; guideId: string }> }) {
  const { slug, guideId } = await params;
  const guide = await getGuide(guideId);
  if (!guide || guide.workSlug !== slug) notFound();
  return (
    <Suspense>
      <GuideEditor guideId={guideId} slug={slug} workNumber={guide.workNumber} heading={`${guide.workNumber} · ${guide.formatLabel} · ${guide.levelLabel}`} />
    </Suspense>
  );
}
