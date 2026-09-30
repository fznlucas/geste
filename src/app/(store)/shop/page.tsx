/** Shop — boards Shop / MShop, docs/screens/store.md §Shop. Every live work; filters run in the browser. */
import type { Metadata } from "next";
import { Suspense } from "react";
import { getWorks, toWorkCard } from "@/lib/api";
import { ShopGrid, type ShopItem } from "./ShopGrid";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage() {
  const works = await getWorks();
  const items: ShopItem[] = works.map((w) => ({
    card: toWorkCard(w),
    level: w.baseLevel,
    palettes: w.palettes.map((p) => p.key),
  }));
  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-20 px-16 pt-24 lg:gap-40 lg:px-32 lg:pt-72">
      <p>
        <span className="hidden lg:inline">&quot;Paint it yourself.&quot;</span>
        <span className="lg:hidden">Paint it yourself.</span> <span className="text-fg-muted">Each work comes with its method, materials and step-by-step guide.</span>
      </p>
      {/* useSearchParams needs a Suspense boundary in a static export; the fallback is the unfiltered grid. */}
      <Suspense fallback={<ShopGrid items={items} static />}>
        <ShopGrid items={items} />
      </Suspense>
    </div>
  );
}
