/** Article — boards Article, MArticle. */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components";
import { articleDate, getArticle, getArticles } from "@/lib/api";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  return a ? { title: a.title, description: a.excerpt } : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const more = await getArticles({ exclude: slug, limit: 3 });

  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-20 px-16 pt-8 lg:gap-56 lg:px-32 lg:pt-40">
      <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted">
        <Link href="/journal" className="hover:text-fg">Journal</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-fg">{article.category}</span>
      </nav>
      <div className="flex max-w-760 flex-col gap-20 lg:gap-12">
        <span className="text-fg-muted">
          {article.category} · {article.readMinutes} min<span className="hidden lg:inline"> · {articleDate(article.publishedAt, true)}</span>
        </span>
        <h1 className="text-lg lg:text-xl">{article.title}</h1>
        <p className="hidden text-body text-fg-muted lg:block">{article.excerpt}</p>
      </div>
      <span className="relative block h-240 w-full lg:h-520">
        <Image src={article.coverUrl} alt={article.coverAlt} fill priority sizes="(min-width: 1200px) 1200px, 100vw" className="object-cover" />
      </span>
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-40">
        <div className="flex flex-col gap-20 lg:col-span-7 lg:col-start-3">
          {article.body.length === 0 && <p className="text-body">{article.excerpt}</p>}
          {article.body.map((b, i) =>
            b.kind === "h2" ? (
              <h2 key={i} className="text-sm leading-[20px] font-medium tracking-normal lg:mt-16">{b.text}</h2>
            ) : (
              <p key={i} className="text-body">
                {b.short ? (
                  <>
                    <span className="lg:hidden">{b.short}</span>
                    <span className="hidden lg:inline">{b.text}</span>
                  </>
                ) : (
                  b.text
                )}
              </p>
            ),
          )}
          {article.cta && (
            <Link href={`/works/${article.cta.work.slug}`} className="group flex items-center justify-between bg-surface-muted p-14 lg:mt-16 lg:px-20 lg:py-16">
              <span>
                <span className="lg:hidden">Try it on {article.cta.work.number}</span>
                <span className="hidden lg:inline">{article.cta.text}</span>
              </span>
              <span className="underline underline-offset-3 group-hover:text-fg-muted">
                <span className="lg:hidden">{article.cta.work.duration}</span>
                <span className="hidden lg:inline">See {article.cta.work.number}</span>
              </span>
            </Link>
          )}
          <Link href="/journal" className="self-start underline underline-offset-3 hover:text-fg-muted lg:hidden">All articles</Link>
        </div>
      </div>
      {more.length > 0 && (
        <section className="hidden flex-col gap-24 border-t border-border pt-40 lg:flex">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs tracking-normal">Keep reading</h2>
            <Link href="/journal" className="underline underline-offset-3 hover:text-fg-muted">All articles</Link>
          </div>
          <div className="grid grid-cols-3 gap-x-40">
            {more.map((a) => (
              <ArticleCard key={a.slug} href={`/journal/${a.slug}`} imageUrl={a.coverUrl} title={a.title} excerpt={a.excerpt} variant="keep" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
