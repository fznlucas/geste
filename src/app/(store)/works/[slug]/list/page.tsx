/** Shopping list — boards ShoppingList, MShoppingList, docs/screens/store.md §Shopping list. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getShoppingList, getWork, getWorks, type ShoppingListLine } from "@/lib/api";
import { FORMATS, type FormatKey } from "@/lib/pricing";
import { ListPage } from "./ListPage";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getWorks()).map((w) => ({ slug: w.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const work = await getWork((await params).slug);
  return work ? { title: `Shopping list · ${work.number}` } : {};
}

export default async function Page({ params }: Props) {
  const work = await getWork((await params).slug);
  if (!work) notFound();
  // Every format's list, so ?format= switches without a request.
  const lists = {} as Record<FormatKey, ShoppingListLine[]>;
  for (const f of Object.keys(FORMATS) as FormatKey[]) lists[f] = await getShoppingList(work.id, f);
  return (
    <Suspense fallback={<ListPage work={work} lists={lists} static />}>
      <ListPage work={work} lists={lists} />
    </Suspense>
  );
}
