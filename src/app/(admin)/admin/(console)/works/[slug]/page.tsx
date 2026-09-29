import type { Metadata } from "next";
import { getWorkSlugs } from "@/lib/api";
import { WorkEditorPage } from "../_parts/WorkEditor";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getWorkSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `N°${slug.slice(1)}` };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WorkEditorPage slug={slug} />;
}
