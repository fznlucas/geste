/** Legal — boards Legal, MLegal, docs/screens/store.md §Legal. One page per document: /legal/notice, terms, privacy, cookies, accessibility. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalDocument, getLegalDocuments } from "@/lib/api";
import { LegalPage } from "./LegalPage";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getLegalDocuments()).map((d) => ({ doc: d.kind }));
}

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await getLegalDocument((await params).doc);
  return doc ? { title: doc.title, description: `Geste — ${doc.title.toLowerCase()}.` } : {};
}

export default async function Page({ params }: Props) {
  const { doc } = await params;
  const docs = await getLegalDocuments();
  if (!docs.some((d) => d.kind === doc)) notFound();
  return <LegalPage docs={docs} current={doc as (typeof docs)[number]["kind"]} />;
}
