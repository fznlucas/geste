"use client";

/**
 * Content actions (AdminContent). Future: `saveSetting` of `src/actions/admin/settings.ts` for
 * "home.*" and an articles action. The store is built at deploy time, so in the mock these changes
 * show in the admin only.
 */
import { getArticleEditor, getHomeSettings, getLegalDocs, storeSetting, type ArticleCategory } from "@/lib/api";
import { adminNow, insertRow, patchRow, requireStaff } from "../admin";

/** "Publish home": hero work + headline (`site_settings` "home.hero_work", "home.headline"). */
export async function publishHome(input: { heroWork: string; headline: string }) {
  const staff = requireStaff(["content"]);
  const headline = input.headline.trim();
  if (!headline) throw new Error("Write a headline.");
  const { options } = await getHomeSettings();
  const work = options.find((o) => o.slug === input.heroWork);
  if (!work) throw new Error("Choose a live work.");
  // A hero that misses part of the checklist can stay (it was there before), not be chosen anew.
  if (!work.ready && work.slug !== (await getHomeSettings()).heroWork) throw new Error(`${work.number}: ${work.missing.join(", ").toLowerCase()}.`);
  patchRow("site_settings", "home", { heroWork: work.slug, headline, publishedAt: adminNow() }, {
    action: "settings.home",
    target: "site_settings:home",
    summary: `${staff.fullName} published the home page · hero ${work.number}`,
  });
}

/** "New article": an untitled draft at the end of the journal list. */
export async function createArticleDraft(): Promise<string> {
  const staff = requireStaff(["content"]);
  const row = insertRow("article_drafts", { title: "Untitled article", category: "Method", createdAt: adminNow() }, {
    action: "article.create",
    target: "article:new",
    summary: `${staff.fullName} started a new journal article`,
  });
  return row.id;
}

export interface ArticleFields {
  title: string;
  category: ArticleCategory;
  coverPath: string;
  bodyMd: string;
  frTitle: string;
  frBodyMd: string;
}

/** Article editor › Save: the text and its French version (a published article: the store follows at the next build). */
export async function saveArticle(id: string, f: ArticleFields): Promise<void> {
  const staff = requireStaff(["content"]);
  const a = await getArticleEditor(id);
  if (!a) throw new Error("This article no longer exists.");
  if (!f.title.trim()) throw new Error("Write a title.");
  const fields = { ...f, title: f.title.trim() };
  if (a.kind === "published") patchRow("article_edits", id, fields, { action: "article.edit", target: `article:${id}`, summary: `${staff.fullName} edited “${fields.title}”` });
  else patchRow("article_drafts", id, fields, { action: "article.edit", target: `article:${id}`, summary: `${staff.fullName} edited the draft “${fields.title}”` });
}

/** Article editor › Publish: a draft goes live (the store shows it after the next build). Needs a body. */
export async function publishArticle(id: string): Promise<void> {
  const staff = requireStaff(["content"]);
  const a = await getArticleEditor(id);
  if (!a || a.kind !== "draft") throw new Error("Only a draft can be published here.");
  if (!a.bodyMd.trim() || a.title === "Untitled article") throw new Error("Give it a title and a text first.");
  patchRow("article_drafts", id, { status: "published", publishedAt: adminNow() }, { action: "article.publish", target: `article:${id}`, summary: `${staff.fullName} published “${a.title}”` });
}

/** Legal pages › Edit › Save draft. */
export async function saveLegalDraft(id: string, bodyMd: string): Promise<void> {
  const staff = requireStaff(["content"]);
  const d = (await getLegalDocs()).find((x) => x.id === id);
  if (!d) throw new Error("Unknown document.");
  patchRow("legal_docs", id, { draftMd: bodyMd }, { action: "legal.draft", target: `legal:${id}`, summary: `${staff.fullName} edited the draft of ${d.title}` });
}

/**
 * Legal pages › Publish: the draft becomes version n+1. A document blocked for a missing fact (the
 * SIRET in Settings › Store, a lawyer's check) cannot be published until it is there.
 */
export async function publishLegal(id: string): Promise<number> {
  const staff = requireStaff(["content"]);
  const d = (await getLegalDocs()).find((x) => x.id === id);
  if (!d) throw new Error("Unknown document.");
  if (d.status === "blocked" && /SIRET/.test(d.note ?? "") && /\[Your name/.test(storeSetting("store.legal_entity"))) throw new Error("Add the legal entity and SIRET in Settings › Store first.");
  if (d.status === "blocked" && /lawyer/.test(d.note ?? "")) throw new Error("A lawyer has to check it first.");
  if (/\[[^\]]+\]/.test(d.bodyMd)) throw new Error("Fill in the [placeholders] first.");
  const version = d.version + 1;
  patchRow("legal_docs", id, { version, updatedAt: adminNow(), status: "live", note: null, bodyMd: d.bodyMd, draftMd: null }, { action: "legal.publish", target: `legal:${id}`, summary: `${staff.fullName} published ${d.title} (v${version})` });
  return version;
}
