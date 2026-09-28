/**
 * Home — boards Home (1440) and MHome (390), docs/screens/store.md §Home.
 * Hero · How it works · New works · Limited prints · From the journal. Built at deploy time.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink, CanvasDiagram, WorkCard } from "@/components";
import { findGuide, getArticles, getEditions, getHomeHeroWork, getWorks, toWorkCard, type PrintEdition } from "@/lib/api";
import { fromPrice, formatPrice } from "@/lib/format";
import { FORMATS } from "@/lib/pricing";

const STEPS = [
  { n: "01", title: "Choose", text: "A work, a format, a palette. The size sets the level.", short: "A work, a format, a palette." },
  { n: "02", title: "Get", text: "Your guide and exact shopping list, unlocked instantly.", short: "Guide and exact shopping list." },
  { n: "03", title: "Paint", text: "Three layers, step by step, on your phone. Even offline.", short: "Three layers, step by step." },
];

export default async function HomePage() {
  const [hero, works, editions, articles] = await Promise.all([getHomeHeroWork(), getWorks(), getEditions(), getArticles({ limit: 2 })]);
  if (!hero) throw new Error("Home hero work is not live");
  const guide = await findGuide(hero.id, hero.defaultFormat, FORMATS[hero.defaultFormat].defaultLevel);
  const strokes = guide?.layers.flatMap((l) => l.diagram) ?? [];

  // New works: desktop shows the first five (hero included), phones the first four without the hero (MHome).
  const desktopIds = new Set(works.slice(0, 5).map((w) => w.id));
  const phoneIds = new Set(works.filter((w) => w.id !== hero.id).slice(0, 4).map((w) => w.id));
  const newWorks = works.filter((w) => desktopIds.has(w.id) || phoneIds.has(w.id));
  const onlyOn = (id: string) => (!phoneIds.has(id) ? "hidden lg:block" : !desktopIds.has(id) ? "lg:hidden" : undefined);

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
        <div className="grid grid-cols-2 gap-x-14 gap-y-24 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-40">
          {newWorks.map((w) => (
            <div key={w.id} className={onlyOn(w.id)}>
              <WorkCard work={toWorkCard(w)} variant="home" />
            </div>
          ))}
        </div>
      </section>

      {/* Limited prints */}
      {prints.length > 0 && (
        <section className="flex flex-col gap-14 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-40">
          <div className="flex justify-between lg:col-span-4 lg:flex-col lg:justify-start lg:gap-10">
            <span className="font-medium">Limited prints</span>
            <span className="hidden text-fg-muted lg:block">Only want to hang it? Our studio paintings, printed on cotton paper in editions of 50. Signed, numbered, with a certificate.</span>
            <Link href="/prints" className="self-start underline underline-offset-3 hover:text-fg-muted">
              <span className="lg:hidden">See prints</span>
              <span className="hidden lg:inline">See the prints</span>
            </Link>
          </div>
          <div className="lg:col-span-8 lg:col-start-5 lg:grid lg:grid-cols-3 lg:gap-x-40">
            {prints.map((e, i) => (
              <Link key={e.id} href={`/prints/${e.workSlug}`} className={`group flex-col gap-8 lg:flex lg:gap-10 ${i === 0 ? "flex" : "hidden"}`}>
                <span className="flex justify-center bg-surface-sunk p-32 lg:block lg:p-24">
                  {/* Fixed sizes as drawn (desktop 197 × 246, a little wider than its column; phone 220 × 275). */}
                  <span className="relative block h-275 w-220 lg:h-246 lg:w-197">
                    <Image src={e.imageUrl} alt="" fill sizes="(min-width: 1200px) 200px, 220px" className="object-cover" />
                  </span>
                </span>
                <span className="flex justify-between">
                  <span className="underline-offset-3 group-hover:underline">
                    {e.workNumber} print<span className="lg:hidden"> · {editionLabel(e, true)}</span>
                  </span>
                  <span>{formatPrice(e.priceCents)}</span>
                </span>
                <span className="hidden text-fg-muted lg:inline">{editionLabel(e, false)}</span>
              </Link>
            ))}
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

/** Home board: the first three A3 editions with copies left, in the editions' order (N°07, N°01, N°08). */
function featuredPrints(editions: PrintEdition[]): PrintEdition[] {
  return editions.filter((e) => e.size === "A3" && !e.soldOut).slice(0, 3);
}

/** "Edition 12/50" (desktop), "12/50" (phone), or "Sold out". */
function editionLabel(e: PrintEdition, short: boolean): string {
  if (e.nextNumber === null) return "Sold out";
  return `${short ? "" : "Edition "}${e.nextNumber}/${e.editionSize}`;
}
