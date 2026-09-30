/**
 * Home — boards Home (1440) and MHome (390), docs/screens/store.md §Home.
 * Hero · How it works · New works · Limited prints · From the journal. Built at deploy time.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink, CanvasDiagram, FitLine, PrintPaper, ProportionalGrid, SHEET_RATIO, WorkCard } from "@/components";
import { findGuide, getArticles, getEditions, getHomeHeroWork, getWorks, toWorkCard, type PrintEdition } from "@/lib/api";
import { fromPrice, formatPrice } from "@/lib/format";
import { PRINT_WITH_GUIDE, defaultLevel } from "@/lib/pricing";

const STEPS = [
  { n: "01", title: "Choose", text: "A work, a format, a palette. The size sets the level.", short: "A work, a format, a palette." },
  { n: "02", title: "Get", text: "Your guide and exact shopping list, unlocked instantly.", short: "Guide and exact shopping list." },
  { n: "03", title: "Paint", text: "Three layers, step by step, on your phone. Even offline.", short: "Three layers, step by step." },
];

export default async function HomePage() {
  const [hero, works, editions, articles] = await Promise.all([getHomeHeroWork(), getWorks(), getEditions(), getArticles({ limit: 2 })]);
  if (!hero) throw new Error("Home hero work is not live");
  const guide = await findGuide(hero.id, hero.defaultFormat, defaultLevel(hero.defaultFormat, hero.baseLevel));
  const strokes = guide?.layers.flatMap((l) => l.diagram) ?? [];

  // New works: desktop shows the first five (hero included), phones the first four without the hero (MHome).
  const desktopWorks = works.slice(0, 5);
  const phoneWorks = works.filter((w) => w.id !== hero.id).slice(0, 4);

  const prints = featuredPrints(editions);

  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-64 px-16 pt-8 lg:gap-120 lg:px-32 lg:pt-24">
      {/* Hero */}
      <section className="flex flex-col gap-16 lg:gap-24">
        <Link href={`/works/${hero.slug}`} aria-label={`${hero.number}, see the work`} className="relative block aspect-[358/440] w-full overflow-hidden bg-surface-muted lg:aspect-[2/1]">
          <Image src={hero.imageUrl} alt="" fill priority sizes="(min-width: 1200px) 1200px, 100vw" className="object-cover" />
          <span className="absolute bottom-10 left-10 bg-bg px-7 py-3 lg:bottom-16 lg:left-16 lg:px-8 lg:py-4">{hero.number} · Digital preview</span>
        </Link>
        <div className="flex flex-col gap-16 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-40">
          <div className="flex flex-col gap-16 lg:col-span-7 lg:gap-8">
            <h1 className="text-lg lg:text-xl">Paint it yourself.</h1>
            <p className="max-w-520 text-fg-muted">
              Abstract works designed stroke by stroke, then broken into layers anyone can follow.
              <span className="hidden lg:inline"> Each comes with its method, materials and step-by-step guide.</span>
            </p>
          </div>
          <div className="flex flex-col-reverse gap-10 lg:col-span-5 lg:col-start-8 lg:flex-row lg:justify-end lg:gap-12">
            <ButtonLink href="/shop" variant="ghost" className="lg:min-w-160">Browse all works</ButtonLink>
            <ButtonLink href={`/works/${hero.slug}`} trailing={fromPrice(hero.minPriceCents)} className="lg:min-w-240">Start with {hero.number}</ButtonLink>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-14 lg:gap-24">
        <SectionHead title="How it works" href="/method" link="Read the method" shortLink="The method" />
        <div className="flex flex-col gap-14 lg:grid lg:grid-cols-3 lg:gap-x-40">
          {STEPS.map((s, i) => (
            <Link key={s.n} href="/method" className="group flex items-center gap-14 lg:flex-col lg:items-stretch lg:gap-10">
              <span className="flex h-120 w-96 shrink-0 items-center justify-center bg-surface-muted lg:h-280 lg:w-auto">
                {/* CanvasDiagram sets display inline, so the breakpoint lives on a wrapper. */}
                <span className="lg:hidden"><CanvasDiagram strokes={strokes} upTo={i + 1} width={60} /></span>
                <span className="hidden lg:block"><CanvasDiagram strokes={strokes} upTo={i + 1} width={150} /></span>
              </span>
              <span className="flex flex-col gap-4 lg:gap-10">
                <span className="flex flex-col gap-4 lg:block">
                  <span className="text-fg-muted">{s.n}</span>
                  <span className="hidden lg:inline"> </span>
                  <span className="font-medium underline-offset-3 group-hover:underline lg:font-normal">{s.title}</span>
                </span>
                <span className="text-fg-muted">
                  <span className="lg:hidden">{s.short}</span>
                  <span className="hidden lg:inline">{s.text}</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* New works */}
      <section className="flex flex-col gap-14 lg:gap-24">
        <SectionHead title="New works" href="/shop" link={`See all ${works.length} works`} shortLink={`See all ${works.length}`} />
        {/* Phones show four works without the hero, desktop the first five: one grid each, so rows are computed on what is shown. */}
        <ProportionalGrid className="lg:hidden" rowSpace="mb-24" items={phoneWorks.map((w) => ({ key: w.id, ratio: w.imageRatio, node: <WorkCard work={toWorkCard(w)} variant="home" /> }))} />
        <ProportionalGrid className="hidden lg:flex" rowSpace="mb-0" items={desktopWorks.map((w) => ({ key: w.id, ratio: w.imageRatio, node: <WorkCard work={toWorkCard(w)} variant="home" /> }))} />
      </section>

      {/* Limited prints */}
      {prints.length > 0 && (
        <section className="flex flex-col gap-14 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-40">
          <div className="flex justify-between lg:col-span-4 lg:flex-col lg:justify-start lg:gap-10">
            <span className="font-medium">Limited prints</span>
            <span className="hidden text-fg-muted lg:block">Only want to hang it? Our studio paintings, printed on cotton paper in editions of 25 to 100. Signed, numbered, with a certificate.</span>
            <Link href="/prints" className="self-start underline underline-offset-3 hover:text-fg-muted">
              <span className="lg:hidden">See prints</span>
              <span className="hidden lg:inline">See the prints</span>
            </Link>
          </div>
          <div className="lg:col-span-8 lg:col-start-5">
            {/* Phones show the first print, desktop three: each on its Sand sheet, one height per row. */}
            <ProportionalGrid className="lg:hidden" rowSpace="mb-0" items={prints.slice(0, 1).map((e) => ({ key: e.id, ratio: SHEET_RATIO[e.orientation], node: <FeaturedPrint e={e} /> }))} />
            {/* Eight columns of the 1200 px grid: 787 px. */}
            <ProportionalGrid className="hidden lg:flex" rowSpace="mb-0" perRow={{ md: 3, lg: 3 }} contentWidth={787} items={prints.map((e) => ({ key: e.id, ratio: SHEET_RATIO[e.orientation], node: <FeaturedPrint e={e} /> }))} />
          </div>
        </section>
      )}

      {/* From the journal */}
      {articles.length > 0 && (
        <section className="flex flex-col gap-14 lg:gap-24">
          <SectionHead title="From the journal" href="/journal" link="All articles" />
          <div className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-x-40">
            {articles.map((a, i) => (
              <Link key={a.slug} href={`/journal/${a.slug}`} className={`group flex-col gap-8 lg:flex lg:flex-row lg:gap-24 ${i === 0 ? "flex" : "hidden"}`}>
                <span className="relative block aspect-[358/220] w-full shrink-0 lg:aspect-[4/5] lg:w-200">
                  <Image src={a.coverUrl} alt="" fill sizes="(min-width: 1200px) 200px, 100vw" className="object-cover" />
                </span>
                <span className="flex flex-col gap-8 lg:gap-6">
                  <span className="text-fg-muted">{a.category} · {a.readMinutes} min</span>
                  <span className="font-medium underline-offset-3 group-hover:underline">{a.title}</span>
                  <span className="hidden text-fg-muted lg:inline">{a.excerpt}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({ title, href, link, shortLink }: { title: string; href: string; link: string; shortLink?: string }): ReactNode {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-xs tracking-normal">{title}</h2>
      <Link href={href} className="underline underline-offset-3 hover:text-fg-muted">
        {shortLink ? (
          <>
            <span className="lg:hidden">{shortLink}</span>
            <span className="hidden lg:inline">{link}</span>
          </>
        ) : (
          link
        )}
      </Link>
    </div>
  );
}

/** One print of the Home: its sheet, "N°07 print   $55", "Edition 12/100" (phone: "N°07 print · 12/100"). */
function FeaturedPrint({ e }: { e: PrintEdition }) {
  return (
    <Link href={`/prints/${e.workSlug}`} aria-label={`${e.workNumber} print, ${editionLabel(e, false)}, ${formatPrice(e.priceCents)}`} className="group flex flex-col gap-8 lg:gap-10">
      <PrintPaper imageUrl={e.imageUrl} alt="" orientation={e.orientation} caption={`${e.workNumber} · Edition of ${e.editionSize}`} className="w-full" sizes="(min-width: 1200px) 400px, 100vw" />
      {/* One line each, as wide as the sheet (FitLine shortens "N°07 print" to "N°07" when needed). */}
      <span aria-hidden="true" className="lg:hidden">
        <FitLine variants={[`${e.workNumber} print · ${editionLabel(e, true)}`, `${e.workNumber} · ${editionLabel(e, true)}`, e.workNumber].map((t) => ({ left: <span className="underline-offset-3 group-hover:underline">{t}</span>, right: formatPrice(e.priceCents) }))} />
      </span>
      <span aria-hidden="true" className="hidden flex-col gap-10 lg:flex">
        <FitLine variants={[`${e.workNumber} print`, e.workNumber].map((t) => ({ left: <span className="underline-offset-3 group-hover:underline">{t}</span>, right: formatPrice(e.priceCents) }))} />
        <FitLine variants={[editionLabel(e, false), editionLabel(e, true)].map((t) => ({ left: <span className="text-fg-muted">{t}</span> }))} />
      </span>
    </Link>
  );
}

/** Home board: the first three S editions with copies left, in the editions' order (N°07, N°01, N°08). */
function featuredPrints(editions: PrintEdition[]): PrintEdition[] {
  return editions.filter((e) => e.size === PRINT_WITH_GUIDE && !e.soldOut).slice(0, 3);
}

/** "Edition 12/100" (desktop), "12/100" (phone), or "Sold out". */
function editionLabel(e: PrintEdition, short: boolean): string {
  if (e.nextNumber === null) return "Sold out";
  return `${short ? "" : "Edition "}${e.nextNumber}/${e.editionSize}`;
}
