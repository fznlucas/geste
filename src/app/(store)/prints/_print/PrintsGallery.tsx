"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button, GridFilter, PrintEditionCard } from "@/components";
import { formatPrice } from "@/lib/format";
import type { Orientation, PrintSize } from "@/lib/pricing";
import type { GalleryEdition } from "./data";

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
 * count "45 prints", the Shop's grid (5 × 208 px, 40 px gaps, 64 px rows; 2 columns on phones).
 * `static`: server render / Suspense fallback, unfiltered and without URL access.
 */
export function PrintsGallery({ items, static: isStatic }: { items: GalleryEdition[]; static?: boolean }) {
  return isStatic ? <Gallery items={items} orientation="all" size="all" onChange={() => {}} /> : <UrlGallery items={items} />;
}

function UrlGallery({ items }: { items: GalleryEdition[] }) {
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

function Gallery({ items, orientation, size, onChange }: { items: GalleryEdition[]; orientation: OrientationFilter; size: SizeFilter; onChange: (next: { orientation?: OrientationFilter; size?: SizeFilter }) => void }) {
  const shown = useMemo(
    () => items.filter((i) => (orientation === "all" || i.orientation === orientation) && (size === "all" || i.size === (size.toUpperCase() as PrintSize))),
    [items, orientation, size],
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
        <div className="grid grid-cols-2 gap-x-14 gap-y-28 md:grid-cols-3 lg:grid-cols-5 lg:justify-items-start lg:gap-x-40 lg:gap-y-64">
          {shown.map((e, n) => (
            <PrintEditionCard key={e.id} href={e.href} imageUrl={e.imageUrl} orientation={e.orientation} number={e.workNumber} size={e.size} next={e.next} price={formatPrice(e.priceCents)} priority={n < 5} />
          ))}
        </div>
      )}
    </>
  );
}
