"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArticleCard, Segmented } from "@/components";
import type { Article, ArticleCategory } from "@/lib/api";

export type JournalItem = Article & { date: string };
type Filter = "all" | Lowercase<ArticleCategory>;

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "method", label: "Method" },
  { value: "stories", label: "Stories" },
  { value: "studio", label: "Studio" },
];

/** Title + category filter (?category=, shareable) + 3-column grid (phone: one column). */
export function JournalGrid({ items, static: isStatic }: { items: JournalItem[]; static?: boolean }) {
  return isStatic ? <View items={items} filter="all" onFilter={() => {}} /> : <UrlJournal items={items} />;
}

function UrlJournal({ items }: { items: JournalItem[] }) {
  const q = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filter = FILTERS.find((f) => f.value === q.get("category"))?.value ?? "all";
  return <View items={items} filter={filter} onFilter={(f) => router.replace(f === "all" ? pathname : `${pathname}?category=${f}`, { scroll: false })} />;
}

function View({ items, filter, onFilter }: { items: JournalItem[]; filter: Filter; onFilter: (f: Filter) => void }) {
  const shown = items.filter((a) => filter === "all" || a.category.toLowerCase() === filter);
  return (
    <>
      <div className="flex flex-col gap-20 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-20 lg:gap-8">
          <span className="text-fg-muted">Journal</span>
          <h1 className="text-lg">Notes from the studio</h1>
        </div>
        <Segmented<Filter> label="Category" gap="gap-x-16 lg:gap-x-20" value={filter} onChange={onFilter} options={FILTERS} />
      </div>
      {/* Min heights: the footer does not jump when a filter leaves fewer posts. Desktop: two rows of cards
          (2 × 410 + 56), what "All" fills, so the footer sits its 180 px under them. */}
      <div className="flex min-h-1500 flex-col gap-32 lg:grid lg:min-h-876 lg:grid-cols-3 lg:content-start lg:gap-x-40 lg:gap-y-56">
        {shown.map((a) => (
          <ArticleCard key={a.slug} href={`/journal/${a.slug}`} imageUrl={a.coverUrl} title={a.title} category={a.category} date={a.date} excerpt={a.excerpt} />
        ))}
      </div>
    </>
  );
}
