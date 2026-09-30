"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button, GridFilter, PrintWorkCard, ProportionalGrid, SHEET_RATIO } from "@/components";
import type { Orientation, PrintSize } from "@/lib/pricing";
import type { GalleryWork } from "./data";

type OrientationFilter = "all" | Orientation;
type SizeFilter = "all" | "s" | "m" | "l";

const ORIENTATIONS: Array<{ value: OrientationFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];
const SIZES: Array<{ value: SizeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
];

const pick = <T extends string>(options: Array<{ value: T }>, raw: string | null): T =>
  options.find((o) => o.value === raw)?.value ?? options[0]!.value;

/**
 * Filters "Orientation" and "Size" (kept in the URL: ?orientation=&size=, shareable, no scroll jump),
 * count "15 prints", one card per work on its Sand sheet in the Shop's grid rules (ProportionalGrid:
 * one sheet height per row, width by orientation). The size filter keeps the works that still have
 * that size; the card then links to it. `static`: server render / Suspense fallback, unfiltered.
 */
export function PrintsGallery({ items, static: isStatic }: { items: GalleryWork[]; static?: boolean }) {
  return isStatic ? <Gallery items={items} orientation="all" size="all" onChange={() => {}} /> : <UrlGallery items={items} />;
}

function UrlGallery({ items }: { items: GalleryWork[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const orientation = pick(ORIENTATIONS, params.get("orientation"));
  const size = pick(SIZES, params.get("size"));
  const onChange = (next: { orientation?: OrientationFilter; size?: SizeFilter }) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return <Gallery items={items} orientation={orientation} size={size} onChange={onChange} />;
}

function Gallery({ items, orientation, size, onChange }: { items: GalleryWork[]; orientation: OrientationFilter; size: SizeFilter; onChange: (next: { orientation?: OrientationFilter; size?: SizeFilter }) => void }) {
  const wanted = size === "all" ? null : (size.toUpperCase() as PrintSize);
  const shown = useMemo(
    () => items.filter((w) => (orientation === "all" || w.orientation === orientation) && (!wanted || w.sizes.some((z) => z.size === wanted && !z.soldOut))),
    [items, orientation, wanted],
  );
  const maxArea = Math.max(...items.map((w) => w.originalArea));
  // One scale for every filter: the reference size fits the widest row any Orientation × Size choice can show.
  const scaleSets = useMemo(
    () =>
      ORIENTATIONS.flatMap((o) =>
        SIZES.map((z) => {
          const want = z.value === "all" ? null : (z.value.toUpperCase() as PrintSize);
          return items
            .filter((w) => (o.value === "all" || w.orientation === o.value) && (!want || w.sizes.some((x) => x.size === want && !x.soldOut)))
            .map((w) => ({ ratio: SHEET_RATIO[w.orientation], area: w.originalArea }));
        }),
      ),
    [items],
  );
  return (
    <>
      <div className="flex flex-col gap-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-40">
          <GridFilter label="Orientation" value={orientation} options={ORIENTATIONS} onChange={(v) => onChange({ orientation: v })} labelWidth="w-88" />
          <GridFilter label="Size" value={size} options={SIZES} onChange={(v) => onChange({ size: v })} labelWidth="w-88" />
        </div>
        <span className="text-fg-muted" aria-live="polite">{shown.length} prints</span>
      </div>
      {shown.length === 0 ? (
        <p className="flex flex-wrap items-center gap-x-8 py-80">
          No print matches these filters.
          <Button variant="text" className="underline" onClick={() => onChange({ orientation: "all", size: "all" })}>Clear filters</Button>
        </p>
      ) : (
        <ProportionalGrid
          // The whole gallery's largest reference canvas fills a column, filtered or not.
          maxArea={maxArea}
          scaleSets={scaleSets}
          items={shown.map((w, n) => ({
            key: w.workId,
            ratio: SHEET_RATIO[w.orientation],
            area: w.originalArea,
            node: (
              <PrintWorkCard
                href={`/prints/${w.slug}${wanted ? `?size=${size}` : ""}`}
                imageUrl={w.imageUrl}
                orientation={w.orientation}
                number={w.number}
                editionSize={w.editionSize}
                sizes={w.sizes}
                fromCents={w.fromCents}
                priority={n < 5}
              />
            ),
          }))}
        />
      )}
    </>
  );
}
