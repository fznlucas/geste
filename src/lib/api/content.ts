/**
 * AdminContent reads: journal with status and views, home settings, translation progress, legal
 * versions. The store keeps reading `getArticles` / `getHomeHeroWork` (built at deploy time): a change
 * made here in the mock shows in the admin only.
 */
import { articles } from "@/data/articles";
import { ARTICLE_VIEWS, articleDrafts, homeSettings, legalDocs, translationAreas, type ArticleDraftRow, type HomeSettingsRow } from "@/data/content";
import { works } from "@/data/works";
import { clone } from "./clone";
import { merged, patched } from "./local";
import type { ArticleCategory } from "./types";

export interface AdminArticle {
  id: string;
  title: string;
  category: ArticleCategory;
  status: "published" | "draft";
  /** Null for a draft. */
  publishedAt: string | null;
  views: number | null;
  /** Store page of a published article. */
  href: string | null;
}

/** Published newest first, then drafts newest first. */
export async function getAdminArticles(): Promise<AdminArticle[]> {
  const published: AdminArticle[] = [...articles]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((a) => ({ id: a.slug, title: a.title, category: a.category, status: "published", publishedAt: a.publishedAt, views: ARTICLE_VIEWS[a.slug] ?? 0, href: `/journal/${a.slug}` }));
  const drafts: AdminArticle[] = merged<ArticleDraftRow>("article_drafts", articleDrafts)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => ({ id: d.id, title: d.title, category: d.category, status: "draft", publishedAt: null, views: null, href: null }));
  return clone([...published, ...drafts]);
}

export interface HomeSettings {
  heroWork: string;
  headline: string;
  publishedAt: string;
  /** Works that can lead the home page: every live work. */
  options: Array<{ slug: string; number: string }>;
}

export async function getHomeSettings(): Promise<HomeSettings> {
  const s = patched<HomeSettingsRow>("site_settings", homeSettings);
  return clone({
    heroWork: s.heroWork,
    headline: s.headline,
    publishedAt: s.publishedAt,
    options: works.filter((w) => w.status === "live").map((w) => ({ slug: w.slug, number: w.number })),
  });
}

export async function getTranslationProgress(): Promise<Array<{ area: string; frDonePct: number }>> {
  return clone(translationAreas);
}

export interface LegalDoc {
  id: string;
  slug: string;
  title: string;
  version: number;
  updatedAt: string;
  status: "live" | "draft" | "blocked";
  note: string | null;
}

export async function getLegalDocs(): Promise<LegalDoc[]> {
  return clone(legalDocs);
}
