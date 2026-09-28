/**
 * `articles` (journal): the six posts of the Journal board. Only "How to avoid mud" has a body
 * (Article / MArticle boards); the others show their lede until they are written.
 */
export interface ArticleRow {
  slug: string;
  title: string;
  category: "Method" | "Stories" | "Studio";
  readMinutes: number;
  excerpt: string;
  coverPath: string;
  coverAlt: string;
  publishedAt: string;
  body: Array<{ kind: "p" | "h2"; text: string; short?: string }>;
  /** Call to action under the body: a work to try the method on. */
  cta: { text: string; workSlug: string } | null;
}

export const articles: ArticleRow[] = [
  {
    slug: "avoid-mud-three-rules",
    title: "How to avoid mud: three rules",
    category: "Method",
    readMinutes: 4,
    excerpt: "Why colours turn grey-brown, and the three habits that keep them clean.",
    coverPath: "mock/work-09.jpg",
    coverAlt: "Detail of clean, layered strokes",
    publishedAt: "2026-09-24T08:00:00Z",
    body: [
      { kind: "p", text: "Mud is what painters call colour that has lost its life. It happens when two colours that sit opposite each other, like orange and blue, are scrubbed together while wet. They cancel into grey-brown.", short: "Mud is colour that has lost its life. It happens when opposite colours are scrubbed together while wet." },
      { kind: "h2", text: "01 · Let each layer dry" },
      { kind: "p", text: "Blue over dry orange stays blue. Blue into wet orange becomes mud. Touch the canvas: if it feels cool, wait.", short: "Blue over dry orange stays blue. Touch the canvas: if it feels cool, wait." },
      { kind: "h2", text: "02 · One stroke, then lift" },
      { kind: "p", text: "Going back and forth mixes the layers under your brush. Push once, lift, and move on.", short: "Going back and forth mixes the layers under your brush." },
      { kind: "h2", text: "03 · Wipe between colours" },
      { kind: "p", text: "A brush carries more paint than you think. Wipe on the rag between two colours, rinse between two mixes.", short: "Wipe on the rag between colours, rinse between mixes." },
    ],
    cta: { text: "Try it on a Beginner work, about an hour.", workSlug: "n01" },
  },
  { slug: "first-canvas-first-signature", title: "First canvas, first signature", category: "Stories", readMinutes: 6, excerpt: "Five first-time painters, the same guide, five different paintings.", coverPath: "mock/work-10.jpg", coverAlt: "", publishedAt: "2026-09-17T08:00:00Z", body: [], cta: null },
  { slug: "dry-brush-one-plate", title: "Dry brush, explained with one plate", category: "Method", readMinutes: 5, excerpt: "Almost no water, almost no paint: how to make a veil skip over the canvas.", coverPath: "mock/work-04.jpg", coverAlt: "", publishedAt: "2026-09-09T08:00:00Z", body: [], cta: null },
  { slug: "how-a-work-is-designed", title: "How a Geste work is designed", category: "Studio", readMinutes: 7, excerpt: "From the first composition to the three layers of the guide.", coverPath: "mock/work-06.jpg", coverAlt: "", publishedAt: "2026-09-02T08:00:00Z", body: [], cta: null },
  { slug: "sunday-with-kids", title: "Painting on a Sunday, with kids", category: "Stories", readMinutes: 4, excerpt: "A Beginner work in one hour, with four hands.", coverPath: "mock/work-02.jpg", coverAlt: "", publishedAt: "2026-08-26T08:00:00Z", body: [], cta: null },
  { slug: "sign-with-paynes-grey", title: "Why we sign with Payne’s grey", category: "Studio", readMinutes: 3, excerpt: "A small detail that makes every canvas feel finished.", coverPath: "mock/work-05.jpg", coverAlt: "", publishedAt: "2026-08-19T08:00:00Z", body: [], cta: null },
];
