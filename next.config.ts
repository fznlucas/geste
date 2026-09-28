import type { NextConfig } from "next";

/**
 * Mock phase: the site is a static export served by GitHub Pages (no server, no API routes).
 * The deploy workflow sets NEXT_PUBLIC_BASE_PATH to "/<repo>"; locally it is empty, so
 * `npm run dev` still serves http://localhost:3000.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // /shop is written as /shop/index.html, which GitHub Pages serves without rewrites.
  trailingSlash: true,
  // No image optimisation server on GitHub Pages.
  images: { unoptimized: true },
};

export default nextConfig;
