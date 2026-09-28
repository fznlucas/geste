/** Journal articles, newest first. */
import { asset } from "@/lib/asset";
import { articles } from "@/data/articles";
import type { ArticleRow } from "@/data/types";
import { works } from "@/data/works";
import { estimatedTime } from "@/lib/pricing";
import { clone } from "./clone";
import type { Article, ArticleCategory, ArticleDetail } from "./types";

function mapArticle({ coverPath, body: _body, cta: _cta, ...a }: ArticleRow): Article {
  return { ...a, coverUrl: asset(coverPath) };
}

export async function getArticles(query: { limit?: number; category?: ArticleCategory; exclude?: string } = {}): Promise<Article[]> {
  return clone(
    [...articles]
      .filter((a) => (!query.category || a.category === query.category) && a.slug !== query.exclude)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, query.limit)
      .map(mapArticle),
  );
}

export async function getArticle(slug: string): Promise<ArticleDetail | null> {
  const row = articles.find((a) => a.slug === slug);
  if (!row) return null;
  const work = row.cta && works.find((w) => w.slug === row.cta!.workSlug);
  return clone({
    ...mapArticle(row),
    body: row.body,
    cta: row.cta && work ? { text: row.cta.text, work: { number: work.number, slug: work.slug, duration: estimatedTime({ format: work.defaultFormat, level: "match", palette: "original" }) } } : null,
  });
}

/** "Sept 24" (Journal board). */
export function articleDate(iso: string, withYear = false): string {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${withYear ? `, ${d.getUTCFullYear()}` : ""}`;
}


