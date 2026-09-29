/**
 * AdminContent reads: journal with status and views, home settings, translation progress, legal
 * versions. The store keeps reading `getArticles` / `getHomeHeroWork` (built at deploy time): a change
 * made here in the mock shows in the admin only.
 */
import { articles } from "@/data/articles";
import { ARTICLE_VIEWS, articleDrafts, homeSettings, legalDocs, legalDocuments, translationAreas, type ArticleDraftRow, type HomeSettingsRow } from "@/data/content";
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

// ── Store: /legal/[doc] ──────────────────────────────────────────────────────

export type LegalKind = "notice" | "terms" | "privacy" | "cookies" | "accessibility";

/** Order and names of the Legal board's side nav (desktop) and accordion (phone: `short`). */
export const LEGAL_KINDS: Array<{ kind: LegalKind; title: string; short: string }> = [
  { kind: "notice", title: "Legal notice", short: "Legal notice" },
  { kind: "terms", title: "Terms of sale", short: "Terms of sale" },
  { kind: "privacy", title: "Privacy policy", short: "Privacy" },
  { kind: "cookies", title: "Cookie settings", short: "Cookie settings" },
  { kind: "accessibility", title: "Accessibility", short: "Accessibility" },
];

export interface LegalDocument {
  kind: LegalKind;
  /** "Terms of sale" (side nav, section title, page title). */
  title: string;
  /** Phone accordion row: "Privacy". */
  short: string;
  version: number;
  publishedAt: string;
  /** One row per "## Heading" of `body_md`. */
  sections: Array<{ heading: string; text: string }>;
  /** Phone accordion text (MLegal); null for cookie settings. */
  summary: string | null;
}

/** "## Heading\ntext\n\n## …" → rows. The legal text is plain: no other markdown is used. */
function legalSections(md: string): LegalDocument["sections"] {
  return md
    .split(/^## /m)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [heading = "", ...rest] = part.split("\n");
      return { heading: heading.trim(), text: rest.join(" ").replace(/\s+/g, " ").trim() };
    });
}

/** The latest published version of each document, in the board's order. */
export async function getLegalDocuments(locale: "en" | "fr" = "en"): Promise<LegalDocument[]> {
  return clone(
    LEGAL_KINDS.flatMap(({ kind, title, short }) => {
      const row = legalDocuments
        .filter((d) => d.kind === kind && d.locale === locale && d.publishedAt)
        .sort((a, b) => b.version - a.version)[0];
      return row ? [{ kind, title, short, version: row.version, publishedAt: row.publishedAt!, sections: legalSections(row.bodyMd), summary: row.summary }] : [];
    }),
  );
}

export async function getLegalDocument(kind: string, locale: "en" | "fr" = "en"): Promise<LegalDocument | null> {
  return (await getLegalDocuments(locale)).find((d) => d.kind === kind) ?? null;
}
