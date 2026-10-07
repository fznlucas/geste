/**
 * AdminContent reads: journal with status and views, home settings, translation progress, legal
 * versions. The store keeps reading `getArticles` / `getHomeHeroWork` (built at deploy time): a change
 * made here in the mock shows in the admin only.
 */
import { articles } from "@/data/articles";
import { articleDrafts, homeSettings, legalDocs, legalDocuments, translationAreas, type ArticleDraftRow, type HomeSettingsRow } from "@/data/content";
import { asset } from "@/lib/asset";
import { simNowIso } from "@/lib/clock";
import { clone } from "./clone";
import { allTraffic, allWorks, merged, patched } from "./local";
import { workChecklist } from "./works";
import type { ArticleCategory } from "./types";

/** Strings per area in the translation files (none yet: the French site is not built). */
const TRANSLATION_FILES: { en: Record<string, number>; fr: Record<string, number> } = { en: {}, fr: {} };

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
  /** Its editor (/admin/content/article/?id=). */
  editHref: string;
}

/**
 * Views of a published article from the traffic rows: about 3 % of the store's daily visits read the
 * journal's newest pieces, each day's share fading by 3 % as the article ages (PostHog later).
 */
function articleViews(publishedAt: string): number {
  const from = publishedAt.slice(0, 10);
  const today = simNowIso().slice(0, 10);
  let views = 0;
  for (const d of allTraffic()) {
    if (d.day < from || d.day > today) continue;
    const age = Math.round((Date.parse(d.day) - Date.parse(from)) / 86_400_000);
    views += d.visits * 0.03 * Math.pow(0.97, age);
  }
  return Math.round(views);
}

interface ArticleEdit {
  id: string;
  title?: string;
  category?: ArticleCategory;
  coverPath?: string;
  bodyMd?: string;
  frTitle?: string;
  frBodyMd?: string;
  status?: "draft" | "published";
  publishedAt?: string | null;
}

/** Published newest first, then drafts newest first. */
export async function getAdminArticles(): Promise<AdminArticle[]> {
  const published: AdminArticle[] = [...articles]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map((a) => {
      const e = patched<ArticleEdit>("article_edits", { id: a.slug });
      return { id: a.slug, title: e.title ?? a.title, category: e.category ?? a.category, status: "published", publishedAt: a.publishedAt, views: articleViews(a.publishedAt), href: `/journal/${a.slug}`, editHref: `/admin/content/article/?id=${a.slug}` };
    });
  // Drafts, and drafts published from the admin (on the store after the next build).
  const drafts: AdminArticle[] = merged<ArticleDraftRow & ArticleEdit>("article_drafts", articleDrafts)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((d) => ({ id: d.id, title: d.title, category: d.category, status: d.status === "published" ? "published" : "draft", publishedAt: d.publishedAt ?? null, views: d.publishedAt ? articleViews(d.publishedAt) : null, href: null, editHref: `/admin/content/article/?id=${d.id}` }));
  return clone([...drafts.filter((d) => d.status === "published"), ...published, ...drafts.filter((d) => d.status === "draft")]);
}

export interface HomeSettings {
  heroWork: string;
  headline: string;
  publishedAt: string;
  /**
   * Works that can lead the home page: live and painted by the studio (Lucas, Oct 7; no work has a real
   * result photo yet). The current hero stays listed with what it misses.
   */
  options: Array<{ slug: string; number: string; ready: boolean; missing: string[] }>;
}

/** What keeps a work from leading the home page: it must be live and painted by the studio. */
export function heroMissing(workId: string): string[] {
  const w = allWorks().find((x) => x.id === workId);
  if (!w) return ["Unknown work"];
  return [...(w.status === "live" ? [] : ["Not live"]), ...workChecklist(w.id).filter((c) => c.key === "studio" && !c.done).map((c) => c.label)];
}

/** The home hero now, and what it misses (the admin alert when it no longer follows the rule). */
export function homeHero(): { slug: string; number: string; missing: string[] } | null {
  const s = patched<HomeSettingsRow>("site_settings", homeSettings);
  const w = allWorks().find((x) => x.slug === s.heroWork);
  return w ? { slug: w.slug, number: w.number, missing: heroMissing(w.id) } : null;
}

export async function getHomeSettings(): Promise<HomeSettings> {
  const s = patched<HomeSettingsRow>("site_settings", homeSettings);
  return clone({
    heroWork: s.heroWork,
    headline: s.headline,
    publishedAt: s.publishedAt,
    options: allWorks()
      .filter((w) => w.status === "live")
      .map((w) => {
        const missing = heroMissing(w.id);
        return { slug: w.slug, number: w.number, ready: missing.length === 0, missing };
      })
      .filter((o) => o.ready || o.slug === s.heroWork),
  });
}

/**
 * French coverage, computed from the translation files (`messages/fr.json` next to `messages/en.json`).
 * There is no `messages/` folder yet: the French site is not built, so every area is at 0 % (the board
 * showed 20 % for the store pages).
 */
export async function getTranslationProgress(): Promise<{ areas: Array<{ area: string; frDonePct: number }>; note: string | null }> {
  const files = TRANSLATION_FILES;
  const pct = (area: string) => {
    const en = files.en[area] ?? 0;
    return en ? Math.round(((files.fr[area] ?? 0) / en) * 100) : 0;
  };
  return clone({
    areas: translationAreas.map((a) => ({ area: a.area, frDonePct: pct(a.area) })),
    note: Object.keys(files.en).length ? null : "No translation files yet (messages/en.json, messages/fr.json): the French site is not built.",
  });
}

export interface LegalDoc {
  id: string;
  slug: string;
  title: string;
  version: number;
  updatedAt: string;
  status: "live" | "draft" | "blocked";
  note: string | null;
  /** The text being edited (Markdown, "## " headings): the published one until a draft is saved. */
  bodyMd: string;
  /** A draft saved here, not published yet. */
  hasDraft: boolean;
}

/** The accessibility statement has its own store page (/legal/accessibility): listed with the others. */
const ACCESSIBILITY: (typeof legalDocs)[number] = { id: "accessibility", slug: "accessibility", title: "Accessibility statement", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "live", note: null };

/** Legal pages with their versions; a draft saved or a version published here (the store follows at the next build). */
export async function getLegalDocs(): Promise<LegalDoc[]> {
  return clone(
    [...legalDocs, ACCESSIBILITY].map((row) => {
      const d = patched<typeof row & { draftMd?: string | null; bodyMd?: string }>("legal_docs", row);
      const published = d.bodyMd ?? legalDocuments.find((x) => x.kind === row.slug && x.locale === "en")?.bodyMd ?? "";
      return { id: d.id, slug: d.slug, title: d.title, version: d.version, updatedAt: d.updatedAt, status: d.status, note: d.note, bodyMd: d.draftMd ?? published, hasDraft: !!d.draftMd };
    }),
  );
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

export interface ArticleEditorData {
  id: string;
  /** A published article of the store, or a draft written here. */
  kind: "published" | "draft";
  title: string;
  category: ArticleCategory;
  coverPath: string;
  coverUrl: string;
  /** Markdown: "## " starts a heading, a blank line a paragraph. */
  bodyMd: string;
  frTitle: string;
  frBodyMd: string;
  status: "draft" | "published";
  publishedAt: string | null;
  /** Pictures that can be the cover: the works' previews. */
  covers: Array<{ path: string; label: string }>;
}

/** /admin/content/article/?id=: an article and its French version as edited here. */
export async function getArticleEditor(id: string): Promise<ArticleEditorData | null> {
  const covers = allWorks().map((w) => ({ path: w.previewPath, label: w.number }));
  const a = articles.find((x) => x.slug === id);
  if (a) {
    const e = patched<ArticleEdit>("article_edits", { id });
    const body = a.body.map((b) => (b.kind === "h2" ? `## ${b.text}` : b.text)).join("\n\n");
    return clone({ id, kind: "published", title: e.title ?? a.title, category: e.category ?? a.category, coverPath: e.coverPath ?? a.coverPath, coverUrl: asset(e.coverPath ?? a.coverPath), bodyMd: e.bodyMd ?? body, frTitle: e.frTitle ?? "", frBodyMd: e.frBodyMd ?? "", status: "published", publishedAt: a.publishedAt, covers });
  }
  const d = merged<ArticleDraftRow & ArticleEdit>("article_drafts", articleDrafts).find((x) => x.id === id);
  if (!d) return null;
  const cover = d.coverPath ?? covers[0]!.path;
  return clone({ id, kind: "draft", title: d.title, category: d.category, coverPath: cover, coverUrl: asset(cover), bodyMd: d.bodyMd ?? "", frTitle: d.frTitle ?? "", frBodyMd: d.frBodyMd ?? "", status: d.status ?? "draft", publishedAt: d.publishedAt ?? null, covers });
}
