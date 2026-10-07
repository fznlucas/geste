import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Fingerprint of everything the simulation engine reads (docs/admin-v2/01 §2): the history cache in the
 * browser is keyed on it, so a change to the engine, its config or the data starts a new cache.
 */
function sourcesHash(dirs: string[]): string {
  const hash = createHash("sha256");
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx|json)$/.test(name)) hash.update(path).update(readFileSync(path));
    }
  };
  for (const d of dirs) walk(d);
  return hash.digest("hex").slice(0, 16);
}

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
  // Keep `next dev` from appending its agent block to CLAUDE.md (the project's instructions live there).
  agentRules: false,
  // No dev overlay button: pages are compared to the boards pixel for pixel in `next dev`.
  devIndicators: false,
  env: { NEXT_PUBLIC_SIM_SOURCE_HASH: sourcesHash(["src/sim", "src/data", "src/config", "src/lib"]) },
};

export default nextConfig;
