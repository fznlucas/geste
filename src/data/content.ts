/**
 * AdminContent: what the admin adds to the journal (views from analytics, unpublished drafts), the
 * home settings (`site_settings` "home.*"), translation progress per area and the legal documents.
 */
import type { ArticleRow } from "./articles";
import { HOME_HERO_WORK } from "./works";

/** Page views per published article (Plausible later). */
export const ARTICLE_VIEWS: Record<string, number> = {
  "avoid-mud-three-rules": 2104,
  "first-canvas-first-signature": 1388,
  "dry-brush-one-plate": 904,
  "how-a-work-is-designed": 612,
  "sunday-with-kids": 488,
  "sign-with-paynes-grey": 351,
};

/** `articles` rows not published yet (status draft): no page on the store. */
export interface ArticleDraftRow {
  id: string;
  title: string;
  category: ArticleRow["category"];
  createdAt: string;
}

export const articleDrafts: ArticleDraftRow[] = [
  { id: "draft-n10-three-tries", title: "Why N°10 took three tries", category: "Studio", createdAt: "2026-09-30T16:00:00Z" },
];

/** `site_settings` "home.hero_work" and "home.headline" (content editors may change them). */
export interface HomeSettingsRow {
  id: "home";
  heroWork: string;
  headline: string;
  publishedAt: string;
}

export const homeSettings: HomeSettingsRow = { id: "home", heroWork: HOME_HERO_WORK, headline: "Paint it yourself.", publishedAt: "2026-09-20T09:00:00Z" };

/** French translation progress per area (next-intl message files, guides, emails, legal). */
export const translationAreas: Array<{ area: string; frDonePct: number }> = [
  { area: "Store pages", frDonePct: 20 },
  { area: "Guides (15 works)", frDonePct: 0 },
  { area: "Emails", frDonePct: 0 },
  { area: "Legal", frDonePct: 0 },
];

/** `legal_documents`: current version per document and what blocks it. */
export interface LegalDocRow {
  id: string;
  /** /legal/[doc] */
  slug: string;
  title: string;
  version: number;
  updatedAt: string;
  status: "live" | "draft" | "blocked";
  /** "Needs SIRET" for a blocked one. */
  note: string | null;
}

export const legalDocs: LegalDocRow[] = [
  { id: "legal-notice", slug: "legal-notice", title: "Legal notice", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "blocked", note: "Needs SIRET" },
  { id: "terms", slug: "terms", title: "Terms of sale", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "blocked", note: "Needs lawyer check" },
  { id: "privacy", slug: "privacy", title: "Privacy policy", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "draft", note: null },
  { id: "cookies", slug: "cookies", title: "Cookie policy", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "live", note: null },
];
