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
  { id: "legal-notice", slug: "notice", title: "Legal notice", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "blocked", note: "Needs SIRET" },
  { id: "terms", slug: "terms", title: "Terms of sale", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "blocked", note: "Needs lawyer check" },
  { id: "privacy", slug: "privacy", title: "Privacy policy", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "draft", note: null },
  { id: "cookies", slug: "cookies", title: "Cookie policy", version: 1, updatedAt: "2026-09-20T09:00:00Z", status: "live", note: null },
];

/**
 * `legal_documents`: the published text of each document (`kind`, `locale`, `version`, `body_md`),
 * word for word from the Legal board; "## Heading" starts a row of the page. `summary` is mock only
 * (no column): the one-paragraph version the phone accordion shows (MLegal). Cookie settings have
 * no text rows on the board: the page draws the consent rows instead.
 */
export interface LegalDocumentRow {
  id: string;
  kind: "notice" | "terms" | "privacy" | "cookies" | "accessibility";
  locale: "en" | "fr";
  version: number;
  bodyMd: string;
  publishedAt: string | null;
  summary: string | null;
}

export const legalDocuments: LegalDocumentRow[] = [
  {
    id: "legal-notice-en-1",
    kind: "notice",
    locale: "en",
    version: 1,
    publishedAt: "2026-09-20T09:00:00Z",
    bodyMd: `## Publisher
[Your name], micro-entreprise, SIRET [number], [address], Lyon, France.

## Contact
hello@geste.studio

## Hosting
[Host name, address]

## Intellectual property
Works, guides, texts and brand are protected. The Geste name is a registered trademark [INPI number].`,
    summary: "[Your name], micro-entreprise, SIRET [number], Lyon. Contact: hello@geste.studio.",
  },
  {
    id: "legal-terms-en-1",
    kind: "terms",
    locale: "en",
    version: 1,
    publishedAt: "2026-09-20T09:00:00Z",
    bodyMd: `## Products
Digital guides with shopping lists, and limited prints.

## Prices
In USD, VAT included. Shipping shown before payment.

## Withdrawal
Prints: 14 days. Guides: waived at checkout for immediate access.

## Previews
Digital previews are illustrations; results vary with every hand.

## Disputes
[Mediator name]. French law applies.`,
    summary: "Prices in USD, VAT included. Prints: 14-day withdrawal. Guides: waived at checkout for immediate access.",
  },
  {
    id: "legal-privacy-en-1",
    kind: "privacy",
    locale: "en",
    version: 1,
    publishedAt: "2026-09-20T09:00:00Z",
    bodyMd: `## What we collect
Email, name, address for prints, orders, guide progress.

## Why
To deliver your guides and prints, and, if you agree, send our letters.

## Payments
Handled by [payment provider]. We never see your card number.

## Your rights
Access, correction, deletion, export: Settings or hello@geste.studio.`,
    summary: "We collect email, name, address for prints and orders. Payments by [provider]. Your rights: Settings or email.",
  },
  { id: "legal-cookies-en-1", kind: "cookies", locale: "en", version: 1, publishedAt: "2026-09-20T09:00:00Z", bodyMd: "", summary: null },
  {
    id: "legal-accessibility-en-1",
    kind: "accessibility",
    locale: "en",
    version: 1,
    publishedAt: "2026-09-20T09:00:00Z",
    bodyMd: `## Commitment
We aim for WCAG 2.1 AA: contrast, keyboard navigation, text alternatives.

## Known limits
[List to complete after the audit]

## Report a problem
hello@geste.studio — we answer within 5 working days.`,
    summary: "We aim for WCAG 2.1 AA. Report a problem: hello@geste.studio.",
  },
];
