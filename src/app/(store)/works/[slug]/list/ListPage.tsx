"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Artwork, Button, ButtonLink, Segmented, ShoppingListTable } from "@/components";
import type { CatalogWork, PaletteKey, ShoppingListLine } from "@/lib/api";
import { createPersistentStore, isRecord, useSession, useStore } from "@/lib/client";
import { formatPrice } from "@/lib/format";
import { LEVELS, formatLabel, resolveLevel, type FormatKey, type LevelKey } from "@/lib/pricing";

/** "I already have" ticks, per work, kept in the browser ("geste.list-have.v1"). */
const haveStore = createPersistentStore<Record<string, number[]>>("list-have", 1, {}, (raw) => {
  if (!isRecord(raw)) return null;
  const out: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(raw)) if (Array.isArray(v)) out[k] = v.filter((n): n is number => Number.isInteger(n));
  return out;
});

interface Props {
  work: CatalogWork;
  /** One list per canvas the work sells. */
  lists: Partial<Record<FormatKey, ShoppingListLine[]>>;
  static?: boolean;
}

export function ListPage(props: Props) {
  return props.static ? <View {...props} format={props.work.defaultFormat} level="match" palette="original" /> : <UrlListPage {...props} />;
}

/** ?format=&level=&palette= as on the work page's "See a full shopping list" link. */
function UrlListPage(props: Props) {
  const q = useSearchParams();
  const format = props.work.formats.find((f) => f.format === q.get("format"))?.format ?? props.work.defaultFormat;
  const rawLevel = q.get("level");
  const level: LevelKey | "match" = rawLevel && rawLevel in LEVELS ? (rawLevel as LevelKey) : "match";
  const palette = props.work.palettes.find((p) => p.key === q.get("palette"))?.key ?? "original";
  return <View {...props} format={format} level={level} palette={palette} />;
}

function View({ work, lists, format, level, palette }: Props & { format: FormatKey; level: LevelKey | "match"; palette: PaletteKey }) {
  const [tier, setTier] = useState<"standard" | "budget">("standard");
  const [sent, setSent] = useState(false);
  const session = useSession();
  const haveAll = useStore(haveStore);
  const have = new Set(haveAll[work.slug] ?? []);
  const lines = lists[format] ?? [];
  const toggle = (position: number) =>
    haveStore.set((all) => {
      const cur = new Set(all[work.slug] ?? []);
      if (cur.has(position)) cur.delete(position);
      else cur.add(position);
      return { ...all, [work.slug]: [...cur].sort((a, b) => a - b) };
    });

  const full = lines.reduce((s, l) => s + l[tier].priceCents, 0);
  const toBuy = lines.reduce((s, l) => s + (have.has(l.position) ? 0 : l[tier].priceCents), 0);
  const haveCount = lines.filter((l) => have.has(l.position)).length;
  const levelLabel = LEVELS[resolveLevel({ format, level }, work.baseLevel)].label;
  const paletteName = work.palettes.find((p) => p.key === palette)?.name ?? "Original";
  const detail = `${work.number} · ${formatLabel(format, work.orientation)} · ${levelLabel} · ${paletteName}`;

  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-18 px-16 pt-8 lg:gap-40 lg:px-32 lg:pt-24">
      <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted">
        <Link href="/account" className="hover:text-fg">Library</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/works/${work.slug}`} className="hidden hover:text-fg lg:inline">{work.number}</Link>
        <span aria-hidden="true" className="hidden lg:inline">/</span>
        <span aria-current="page" className="text-fg">
          <span className="lg:hidden">{work.number} · list</span>
          <span className="hidden lg:inline">Shopping list</span>
        </span>
      </nav>
      <div className="flex flex-col gap-18 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-40">
        <div className="flex flex-col gap-18 lg:col-span-8 lg:gap-24">
          <div className="flex items-center gap-20">
            <span className="hidden shrink-0 lg:block">
              <Artwork src={work.imageUrl} orientation={work.orientation} className="w-72" sizes="72px" />
            </span>
            <div className="flex flex-col gap-18 lg:gap-4">
              <h1 className="text-lg">Shopping list</h1>
              <span className="text-fg-muted">
                {detail}
                <span className="hidden lg:inline"> palette</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Segmented<"standard" | "budget">
              label="Price range"
              gap="gap-x-16 lg:gap-x-20"
              value={tier}
              onChange={setTier}
              options={[{ value: "standard", label: "Standard" }, { value: "budget", label: "Budget" }]}
            />
            <span className="text-fg-muted">
              <span className="lg:hidden">{haveCount}/{lines.length} at home</span>
              <span className="hidden lg:inline">{haveCount} of {lines.length} already at home</span>
            </span>
          </div>
          <ShoppingListTable lines={lines} tier={tier} have={have} onToggle={toggle} />
          <div className="hidden flex-col gap-8 bg-surface-muted px-20 py-16 lg:flex">
            <span className="font-medium">From your kitchen</span>
            <span className="text-fg-muted">Two jars of water · a large plate as a palette · paper towels or an old rag · newspaper for the table · an old t-shirt</span>
          </div>
        </div>
        <aside className="flex flex-col gap-8 bg-surface-hover p-14 lg:col-span-4 lg:col-start-9 lg:gap-14 lg:p-24">
          <span className="hidden text-fg-muted lg:inline">Estimated budget</span>
          <div className="flex justify-between"><span>Still to buy</span><span className="tabular-nums">{formatPrice(toBuy)}</span></div>
          <div className="hidden justify-between text-fg-muted lg:flex"><span>Full list</span><span className="tabular-nums">{formatPrice(full)}</span></div>
          <span className="text-fg-muted">
            <span className="lg:hidden">Indicative prices. Links may earn the studio a small commission.</span>
            <span className="hidden lg:inline">Prices are indicative. Links may earn the studio a small commission, at no cost to you.</span>
          </span>
          {sent ? (
            <span role="status" className="lg:flex lg:min-h-48 lg:items-center">
              {session.status === "signed_in" ? `Sent to ${session.session.email}.` : "Sent to your inbox."}
            </span>
          ) : (
            // Mock: nothing is sent (docs/mock-plan.md).
            <Button trailing="→" onClick={() => setSent(true)} fullWidth>Email me this list</Button>
          )}
          {/* ButtonLink sets its own display: breakpoints go on wrappers. */}
          <div className="hidden lg:block"><ButtonLink href="/account" variant="ghost" fullWidth>Open the guide</ButtonLink></div>
        </aside>
        <div className="lg:hidden"><ButtonLink href="/account" variant="ghost" fullWidth>Open the guide</ButtonLink></div>
      </div>
    </div>
  );
}
