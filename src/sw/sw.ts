/// <reference lib="webworker" />
/**
 * Service worker of the guide reader (docs/screens/reader.md §PWA, docs/mock-plan.md M8). Built by
 * `serwist build` (serwist.config.mjs) into out/sw.js after `next build`; registered by the reader
 * with the scope `<base>/learn/`.
 *
 * - Precache: the /learn start page, the manifest and the icons.
 * - Reader pages (HTML and RSC payloads under /learn/): network first, cached for offline, keyed
 *   without the query (`?step=2c` and `?layer=2` open the same page).
 * - Build files (/_next/static/, hashed): cache first. Images and fonts: cache first, 60 days.
 * - "WARM_GUIDE" message (sent by the reader once a guide is open online): caches that guide's
 *   step, timer and print pages and every build file they reference, so the whole guide works
 *   offline after one online visit ("Open it once online and it works offline").
 */
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// "<origin><base>/learn/" → "<base>"
const BASE = new URL(self.registration.scope).pathname.replace(/\/learn\/$/, "");
const PAGES = "geste-reader-pages";
const STATIC = "geste-static";

const stripQuery = {
  cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    // Keep Next's RSC marker apart from the HTML of the same path.
    const rsc = url.searchParams.has("_rsc") || request.headers.get("RSC") === "1";
    url.search = rsc ? "?_rsc" : "";
    return url.href;
  },
};

const isReaderPage = (url: URL) => url.origin === self.location.origin && url.pathname.startsWith(`${BASE}/learn/`) && !url.pathname.endsWith(".js");

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }) => isReaderPage(url),
      handler: new NetworkFirst({ cacheName: PAGES, networkTimeoutSeconds: 4, plugins: [stripQuery] }),
    },
    {
      matcher: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith(`${BASE}/_next/static/`),
      handler: new CacheFirst({ cacheName: STATIC }),
    },
    {
      matcher: ({ request, url }) => url.origin === self.location.origin && (request.destination === "image" || request.destination === "font" || /\.(jpg|png|svg|woff2)$/.test(url.pathname)),
      handler: new CacheFirst({ cacheName: "geste-media", plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 24 * 3600 })] }),
    },
  ],
  // A reader page never opened online: the start page (it opens the last guide) instead of the browser's error.
  fallbacks: { entries: [{ url: `${BASE}/learn/`, matcher: ({ request }) => request.destination === "document" }] },
});

/** Fetches a page, caches it without its query, then caches every build file its HTML references. */
async function warm(pageUrl: string) {
  const pages = await caches.open(PAGES);
  const statics = await caches.open(STATIC);
  const url = new URL(pageUrl, self.location.href);
  url.search = "";
  const res = await fetch(url.href, { credentials: "same-origin" });
  if (!res.ok) return;
  await pages.put(url.href, res.clone());
  const html = await res.text();
  const refs = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="([^"]*\/_next\/static\/[^"]+)"/g)) refs.add(new URL(m[1]!, url).href);
  // Chunks named in the inline flight data ("/_next/static/chunks/….js", after the base path).
  for (const m of html.matchAll(/\/_next\/static\/(?:chunks|css|media)\/[\w\-./]+?\.(?:js|css|woff2)/g)) refs.add(new URL(`${BASE}${m[0]}`, self.location.origin).href);
  await Promise.all(
    [...refs].map(async (r) => {
      if (await statics.match(r)) return;
      const f = await fetch(r).catch(() => null);
      if (f?.ok) await statics.put(r, f);
    }),
  );
}

self.addEventListener("message", (event) => {
  const data = event.data as { type?: string; urls?: string[] } | null;
  if (data?.type !== "WARM_GUIDE" || !Array.isArray(data.urls)) return;
  const done = Promise.all(data.urls.map((u) => warm(u).catch(() => undefined)));
  event.waitUntil(done);
  void done.then(() => event.ports[0]?.postMessage(true));
});

serwist.addEventListeners();
