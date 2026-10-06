"use client";

/**
 * Content actions (AdminContent). Future: `saveSetting` of `src/actions/admin/settings.ts` for
 * "home.*" and an articles action. The store is built at deploy time, so in the mock these changes
 * show in the admin only.
 */
import { getHomeSettings } from "@/lib/api";
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
