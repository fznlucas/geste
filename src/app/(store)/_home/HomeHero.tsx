"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components";
import { getHomeSettings, getWork, type CatalogWork } from "@/lib/api";
import { useHydrated } from "@/lib/client";
import { fromPrice } from "@/lib/format";

type HeroWork = Pick<CatalogWork, "slug" | "number" | "imageUrl" | "minPriceCents">;

/**
 * The home hero (Home, MHome). Built with the hero of the deploy; when "Publish home" was used in this
 * browser (the admin overlay), the hero work and the headline follow it at once (docs/admin-v2/04
 * Content); the next build bakes them in.
 */
export function HomeHero({ built, headline: builtHeadline }: { built: HeroWork; headline: string }) {
  const hydrated = useHydrated();
  const [live, setLive] = useState<{ hero: HeroWork; headline: string } | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    let on = true;
    void getHomeSettings().then(async (s) => {
      if (s.heroWork === built.slug && s.headline === builtHeadline) return;
      const w = s.heroWork === built.slug ? built : await getWork(s.heroWork);
      if (on && w) setLive({ hero: w, headline: s.headline });
    });
    return () => {
      on = false;
    };
  }, [hydrated, built, builtHeadline]);
  const hero = live?.hero ?? built;
  const headline = live?.headline ?? builtHeadline;
  return (
    <section className="flex flex-col gap-16 lg:gap-24">
      <Link href={`/works/${hero.slug}`} aria-label={`${hero.number}, see the work`} className="relative block aspect-[358/440] w-full overflow-hidden bg-surface-muted lg:aspect-[2/1]">
        <Image src={hero.imageUrl} alt="" fill priority sizes="(min-width: 1200px) 1200px, 100vw" className="object-cover" />
        <span className="absolute bottom-10 left-10 bg-bg px-7 py-3 lg:bottom-16 lg:left-16 lg:px-8 lg:py-4">{hero.number} · Digital preview</span>
      </Link>
      <div className="flex flex-col gap-16 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-40">
        <div className="flex flex-col gap-16 lg:col-span-7 lg:gap-8">
          <h1 className="text-lg lg:text-xl">{headline}</h1>
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
  );
}
