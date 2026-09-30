"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button, GridFilter, ProportionalGrid, WorkCard } from "@/components";
import type { LevelKey, PaletteKey } from "@/lib/api";
import type { Work } from "@/lib/types";

export interface ShopItem {
  card: Work;
  /** Level of the card (the default format's level). */
  level: LevelKey;
  palettes: PaletteKey[];
}

type LevelFilter = "all" | LevelKey;
type PaletteFilter = "all" | Exclude<PaletteKey, "original">;

const LEVELS: Array<{ value: LevelFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];
const PALETTES: Array<{ value: PaletteFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "earth", label: "Earth" },
];

const pick = <T extends string>(options: Array<{ value: T }>, raw: string | null): T =>
  options.find((o) => o.value === raw)?.value ?? options[0]!.value;

/**
 * Filters "Level" and "Palette" (kept in the URL: ?level=&palette=, shareable, no scroll jump),
 * count "15 works", ProportionalGrid: 5 per row at one height (260 px, less when a row would pass
 * 1200 px), each work as wide as its ratio, 40 px gaps, 64 px rows; pairs of equal height on phones.
 * `static`: server render / Suspense fallback, unfiltered and without URL access.
 */
export function ShopGrid({ items, static: isStatic }: { items: ShopItem[]; static?: boolean }) {
  return isStatic ? <Grid items={items} level="all" palette="all" onChange={() => {}} /> : <UrlGrid items={items} />;
}

function UrlGrid({ items }: { items: ShopItem[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const level = pick(LEVELS, params.get("level"));
  const palette = pick(PALETTES, params.get("palette"));
  const onChange = (next: { level?: LevelFilter; palette?: PaletteFilter }) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return <Grid items={items} level={level} palette={palette} onChange={onChange} />;
}

function Grid({ items, level, palette, onChange }: { items: ShopItem[]; level: LevelFilter; palette: PaletteFilter; onChange: (next: { level?: LevelFilter; palette?: PaletteFilter }) => void }) {
  const shown = useMemo(
    () => items.filter((i) => (level === "all" || i.level === level) && (palette === "all" || i.palettes.includes(palette))),
    [items, level, palette],
  );
  // One scale for every filter: the reference size fits the widest row any Level × Palette choice can show.
  const maxArea = Math.max(...items.map((i) => i.card.originalArea));
  const scaleSets = useMemo(
    () =>
      LEVELS.flatMap((l) =>
        PALETTES.map((p) =>
          items
            .filter((i) => (l.value === "all" || i.level === l.value) && (p.value === "all" || i.palettes.includes(p.value)))
            .map((i) => ({ ratio: i.card.imageRatio, area: i.card.originalArea })),
        ),
      ),
    [items],
  );
  return (
    <>
      <div className="flex flex-col gap-20 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-40">
          <GridFilter label="Level" value={level} options={LEVELS} onChange={(v) => onChange({ level: v })} />
          <GridFilter label="Palette" value={palette} options={PALETTES} onChange={(v) => onChange({ palette: v })} />
        </div>
        <span className="text-fg-muted" aria-live="polite">{shown.length} works</span>
      </div>
      {shown.length === 0 ? (
        <p className="flex flex-wrap items-center gap-x-8 py-80">
          No work matches these filters.
          <Button variant="text" className="underline" onClick={() => onChange({ level: "all", palette: "all" })}>Clear filters</Button>
        </p>
      ) : (
        <ProportionalGrid maxArea={maxArea} scaleSets={scaleSets} items={shown.map((i, n) => ({ key: i.card.id, ratio: i.card.imageRatio, area: i.card.originalArea, node: <WorkCard work={i.card} priority={n < 5} /> }))} />
      )}
    </>
  );
}

