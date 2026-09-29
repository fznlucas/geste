// Builds the reader's service worker after the static export: `next build && serwist build`.
// The precache holds the /learn start page, the manifest and the icons; everything else is cached
// at runtime by src/sw/sw.ts. URLs are relative to out/sw.js, so the base path needs no rewrite.
/** @type {import("@serwist/cli").BuildOptions} */
const config = {
  swSrc: "src/sw/sw.ts",
  swDest: "out/sw.js",
  globDirectory: "out",
  globPatterns: ["learn/index.html", "manifest.webmanifest", "icons/*.png", "icon.svg", "favicon.ico", "apple-icon.png"],
  manifestTransforms: [
    (entries) => ({ manifest: entries.map((e) => (e.url.endsWith("/index.html") ? { ...e, url: e.url.slice(0, -"index.html".length) } : e)), warnings: [] }),
  ],
};

export default config;
