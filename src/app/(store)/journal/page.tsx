/** Journal — boards Journal, MJournal. */
import type { Metadata } from "next";
import { Suspense } from "react";
import { articleDate, getArticles } from "@/lib/api";
import { JournalGrid, type JournalItem } from "./JournalGrid";

export const metadata: Metadata = { title: "Journal", description: "Notes from the studio: methods, stories and how the works are made." };

export default async function Page() {
  const items: JournalItem[] = (await getArticles()).map((a) => ({ ...a, date: articleDate(a.publishedAt) }));
  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-20 px-16 pt-24 lg:gap-48 lg:px-32 lg:pt-88">
      <Suspense fallback={<JournalGrid items={items} static />}>
        <JournalGrid items={items} />
      </Suspense>
    </div>
  );
}
