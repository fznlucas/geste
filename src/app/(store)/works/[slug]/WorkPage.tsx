"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Accordion, GuideConfigurator, ProductGallery, StickyBuyBar, useToast } from "@/components";
import { toConfiguratorPalettes, type CatalogWork, type GuideOutlineStep, type PaletteKey, type PrintEdition } from "@/lib/api";
import { addToCart } from "@/lib/client";
import { formatPrice } from "@/lib/format";
import { duration } from "@/lib/motion";
import { FORMATS, LEVELS, PRINT_A3_PRICE, guidePriceCents, materialsEstimateUsd, resolveLevel, totalCents, type GuideConfig, type LevelKey } from "@/lib/pricing";

interface Props {
  work: CatalogWork;
  /** The A3 edition sold with "Guide + list + print", null when there is none with copies left. */
  a3: PrintEdition | null;
  /** getGuideOutline for every "level:palette". */
  outlines: Record<string, GuideOutlineStep[]>;
  /** Server render / Suspense fallback: default configuration, no URL access. */
  static?: boolean;
}

export function WorkPage(props: Props) {
  return props.static ? <View {...props} config={defaultConfig(props.work)} onChange={() => {}} /> : <UrlWorkPage {...props} />;
}

function defaultConfig(work: CatalogWork): GuideConfig {
  return { format: work.defaultFormat, level: "match", palette: "original", withPrint: false };
}

/** ?format=&level=&palette=&print=1 → a configuration the work actually sells (anything else falls back to the default). */
function parseConfig(work: CatalogWork, a3: PrintEdition | null, q: URLSearchParams): GuideConfig {
  const d = defaultConfig(work);
  const format = work.formats.find((f) => f.active && f.format === q.get("format"))?.format ?? d.format;
  const rawLevel = q.get("level");
  const level: GuideConfig["level"] = rawLevel && rawLevel in LEVELS ? (rawLevel as LevelKey) : "match";
  const palette = work.palettes.find((p) => p.key === q.get("palette"))?.key ?? d.palette;
  return { format, level, palette, withPrint: !!a3 && q.get("print") === "1" };
}

function UrlWorkPage(props: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const config = parseConfig(props.work, props.a3, params);
  const onChange = (next: GuideConfig) => {
    const d = defaultConfig(props.work);
    const q = new URLSearchParams();
    if (next.format !== d.format) q.set("format", next.format);
    if (next.level !== "match") q.set("level", next.level);
    if (next.palette !== d.palette) q.set("palette", next.palette);
    if (next.withPrint) q.set("print", "1");
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  return <View {...props} config={config} onChange={onChange} />;
}

function View({ work, a3, outlines, config, onChange }: Props & { config: GuideConfig; onChange: (c: GuideConfig) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const level = resolveLevel(config);
  const palette = work.palettes.find((p) => p.key === config.palette) ?? work.palettes[0]!;
  const outline = outlines[`${level}:${palette.key}`] ?? [];
  const total = formatPrice(totalCents(config));
  const formatLabel = FORMATS[config.format].label;

  const add = () => {
    addToCart({ kind: "guide", workId: work.id, format: config.format, level: config.level, palette: config.palette as PaletteKey });
    if (config.withPrint && a3) addToCart({ kind: "print", editionId: a3.id, quantity: 1 });
    // docs/motion.md §5: "Added ✓" for 1.6 s; the drawer does not open on desktop; phones get a toast with "View".
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), duration.addedLabel);
    if (!window.matchMedia("(min-width: 1200px)").matches) {
      toast.show("Added to cart", { action: { label: "View", onClick: () => router.push("/cart") } });
    }
  };

  const items = [
    {
      name: <>Guide, {formatLabel}, {LEVELS[level].label.toLowerCase()}<span className="hidden lg:inline"> (library + PDF)</span></>,
      price: formatPrice(guidePriceCents(config)),
    },
    {
      name: <><span className="lg:hidden">Shopping list</span><span className="hidden lg:inline">Shopping list: materials ~${materialsEstimateUsd(config)} at partner stores</span></>,
      price: "Included",
    },
    ...(config.withPrint ? [{ name: <>Print A3, limited edition<span className="hidden lg:inline">, signed</span></>, price: formatPrice(a3?.priceCents ?? PRINT_A3_PRICE) }] : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-22 px-16 pb-120 lg:gap-24 lg:px-32 lg:pb-0 lg:pt-24">
      {/* Product board: no line-height on main (normal ≈ 16 px); MProduct: 20 px. */}
      <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted lg:leading-[16px]">
        <Link href="/shop" className="hover:text-fg">Shop</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-fg">{work.number}</span>
      </nav>
      <div className="flex flex-col gap-22 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-40">
        <div className="lg:col-span-7">
          <ProductGallery
            workNumber={work.number}
            imageUrl={work.imageUrl}
            filter={palette.previewFilter}
            format={config.format}
            caption={`${palette.name} palette, ${formatLabel}`}
            resultPhotoUrl={work.resultPhotoUrl}
            priority
          />
        </div>
        <div className="flex flex-col gap-22 lg:col-span-5 lg:gap-24">
          <div className="flex flex-col gap-6">
            <div className="flex justify-between">
              <h1 className="text-xs tracking-normal">{work.number}</h1>
              <span className="tabular-nums">{total}</span>
            </div>
            <p className="hidden text-fg-muted lg:block">{work.description}</p>
          </div>
          <GuideConfigurator
            value={config}
            onChange={onChange}
            palettes={toConfiguratorPalettes(work)}
            formats={work.formats.filter((f) => f.active).map((f) => f.format)}
            printAvailable={!!a3}
            onAdd={add}
            added={added}
          />
          <Accordion
            items={[
              {
                value: "guide",
                title: `The guide · ${outline.length} steps`,
                content: (
                  <ol className="flex flex-col gap-6 text-fg">
                    {outline.map((s) => (
                      <li key={s.n} className="grid grid-cols-[24px_1fr] lg:grid-cols-[28px_1fr] lg:gap-x-8">
                        <span className="text-fg-muted">{s.n}</span>
                        <span>
                          <span className="lg:hidden">{s.short}</span>
                          <span className="hidden lg:inline">{s.text}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                ),
              },
              {
                value: "included",
                title: `Included · ${items.length} items`,
                content: (
                  <div className="flex flex-col gap-6 text-fg lg:gap-0">
                    {items.map((it, i) => (
                      <div key={i} className="flex justify-between gap-12 lg:py-4">
                        <span>{it.name}</span>
                        <span className="text-fg-muted">{it.price}</span>
                      </div>
                    ))}
                    <Link href={`/works/${work.slug}/list?format=${config.format}&level=${config.level}&palette=${config.palette}`} className="mt-8 self-start underline underline-offset-3 hover:text-fg-muted">See a full shopping list</Link>
                  </div>
                ),
              },
              {
                value: "shipping",
                title: "Shipping & returns",
                content: (
                  <p className="pt-12 lg:pt-12">
                    <span className="lg:hidden">Guides unlock instantly. Prints ship in 3–5 days, free returns within 14 days. </span>
                    <span className="hidden lg:inline">Guides unlock instantly in your library. Prints ship rolled in a tube from Lyon in 3–5 days, free returns within 14 days. </span>
                    <Link href="/help#shipping" className="text-fg underline underline-offset-3 hover:text-fg-muted">
                      <span className="lg:hidden">More</span>
                      <span className="hidden lg:inline">Shipping &amp; returns</span>
                    </Link>
                  </p>
                ),
              },
            ]}
          />
        </div>
      </div>
      <StickyBuyBar title={`${work.number} · ${formatLabel}`} detail={config.withPrint ? "Guide + list + print" : "Guide + list"} price={total} onAdd={add} added={added} />
    </div>
  );
}
