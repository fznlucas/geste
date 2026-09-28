/** Print page — boards Print, MPrint, docs/screens/store.md §Prints. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPrintPage, printSlugs } from "../_print/data";
import { PrintPage } from "../_print/PrintPage";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await printSlugs()).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPrintPage((await params).slug);
  return data ? { title: `${data.work.number} — Limited print` } : {};
}

export default async function Page({ params }: Props) {
  const data = await getPrintPage((await params).slug);
  if (!data) notFound();
  return (
    <Suspense fallback={<PrintPage {...data} static />}>
      <PrintPage {...data} />
    </Suspense>
  );
}
