/** Base path of the deployed site ("" locally, "/<repo>" on GitHub Pages). Inlined at build time. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * URL of a file in `public/`. next/image and <img> do not add the basePath to `src`, so every
 * public file (mock artworks included) goes through here: asset("mock/work-03.jpg").
 */
export function asset(path: string): string {
  return `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
}
