/**
 * `articles` (journal). Mock: the two teasers of the Home board; bodies come with the Journal step.
 */
export interface ArticleRow {
  slug: string;
  title: string;
  category: "Method" | "Stories";
  readMinutes: number;
  excerpt: string;
  coverPath: string;
  publishedAt: string;
}

export const articles: ArticleRow[] = [
  {
    slug: "avoid-mud-three-rules",
    title: "How to avoid mud: three rules",
    category: "Method",
    readMinutes: 4,
    excerpt: "Why colours turn grey-brown, and the three habits that keep them clean.",
    coverPath: "mock/work-09.jpg",
    publishedAt: "2026-09-24T08:00:00Z",
  },
  {
    slug: "first-canvas-first-signature",
    title: "First canvas, first signature",
    category: "Stories",
    readMinutes: 6,
    excerpt: "Five first-time painters, the same guide, five different paintings.",
    coverPath: "mock/work-10.jpg",
    publishedAt: "2026-09-17T08:00:00Z",
  },
];
