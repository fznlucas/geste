/** Journal articles, newest first. */
import { asset } from "@/lib/asset";
import { articles } from "@/data/articles";
import { clone } from "./clone";
import type { Article } from "./types";

export async function getArticles(query: { limit?: number } = {}): Promise<Article[]> {
  return clone(
    [...articles]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, query.limit)
      .map(({ coverPath, ...a }) => ({ ...a, coverUrl: asset(coverPath) })),
  );
}
