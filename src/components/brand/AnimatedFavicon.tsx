"use client";

import { useEffect } from "react";
import { faviconFrameSvg, faviconLoop, frameKey, svgDataUrl } from "./faviconFrames";
import { FAVICON } from "@/lib/motion";

/**
 * Loops the favicon (docs/decisions.md "Animated favicon", the one exception to "nothing loops"): the
 * "g" drawn stroke by stroke, held, erased backwards, a rest, again. Mounted once in the root layout,
 * so the store, the reader (/learn) and the admin share it across client navigations.
 *
 * - Images: every distinct image of the loop drawn once on a canvas from the favicon's SVG, at 16 and
 *   32 px (32 on Retina screens, where the tab shows 16 CSS px), cached as PNG data URLs.
 * - Clock: a Web Worker ticks at 12 images a second. A page's own timers slow to one a second in a
 *   background tab, then one a minute after 5 minutes (Chrome); a worker's keep going (about 5 a
 *   second in a background tab on macOS, measured by scripts/favicon-background.mjs). The image
 *   shown comes from the time since the start, so a late tick never shifts the loop.
 * - Every <link rel="icon"> of the page (favicon.ico, icon.svg) takes the same image, so whichever one
 *   the browser picked shows it; links re-rendered by a navigation are taken over at the next image.
 * - Off, the static favicon untouched, under prefers-reduced-motion (live), on Safari (it does not
 *   redraw a favicon that changes) and on touch-only devices (no tab strip to see it in).
 */
export function AnimatedFavicon() {
  useEffect(() => {
    if (!supported()) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stop: (() => void) | null = null;
    const sync = () => {
      if (reduce.matches) {
        stop?.();
        stop = null;
      } else stop ??= start();
    };
    sync();
    reduce.addEventListener("change", sync);
    return () => {
      reduce.removeEventListener("change", sync);
      stop?.();
    };
  }, []);
  return null;
}

function supported(): boolean {
  if (typeof Worker === "undefined" || typeof document.createElement("canvas").getContext !== "function") return false;
  const ua = navigator.userAgent;
  const safari = /Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS|FxiOS|Edg\/|OPR\//.test(ua);
  const touchOnly = window.matchMedia("(hover: none)").matches;
  return !safari && !touchOnly;
}

/** The loop's images, drawn once per page load: size → frame index → PNG data URL. */
let cache: Promise<Record<16 | 32, string[]>> | null = null;

function images(): Promise<Record<16 | 32, string[]>> {
  cache ??= (async () => {
    const loop = faviconLoop();
    const draw = async (size: 16 | 32) => {
      const byKey = new Map<string, string>();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      for (const frame of loop) {
        const key = frameKey(frame);
        if (byKey.has(key)) continue;
        const img = new Image();
        img.src = svgDataUrl(faviconFrameSvg(size, frame));
        await img.decode();
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        byKey.set(key, canvas.toDataURL("image/png"));
      }
      return loop.map((f) => byKey.get(frameKey(f))!);
    };
    return { 16: await draw(16), 32: await draw(32) };
  })();
  cache.catch(() => (cache = null));
  return cache;
}

/** The worker's whole source: post a tick every `ms` it is sent, stop on 0. */
const CLOCK = "let t;onmessage=(e)=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}";

/** Starts the loop once the page is idle; returns the stop, which puts the static favicon back. */
function start(): () => void {
  let stopped = false;
  let worker: Worker | null = null;
  let workerUrl: string | null = null;
  const original = new Map<HTMLLinkElement, { href: string; type: string | null }>();

  const icons = () => [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')];
  const run = async () => {
    let loop: Record<16 | 32, string[]>;
    try {
      loop = await images();
    } catch {
      return; // No canvas or no SVG decoding: the static favicon stays.
    }
    if (stopped) return;
    const frameMs = 1000 / FAVICON.fps;
    const t0 = performance.now();
    let shown = "";
    const tick = () => {
      const frames = loop[window.devicePixelRatio >= 1.5 ? 32 : 16];
      const href = frames[Math.floor((performance.now() - t0) / frameMs) % frames.length]!;
      for (const link of icons()) {
        if (!original.has(link)) original.set(link, { href: link.href, type: link.getAttribute("type") });
        else if (href === shown && link.href === href) continue;
        link.type = "image/png";
        link.href = href;
      }
      shown = href;
    };
    tick();
    workerUrl = URL.createObjectURL(new Blob([CLOCK], { type: "text/javascript" }));
    worker = new Worker(workerUrl);
    worker.onmessage = tick;
    worker.postMessage(frameMs);
  };

  // After the page's own work: the images take a few milliseconds each.
  const hasIdle = typeof window.requestIdleCallback === "function";
  const idle = hasIdle ? window.requestIdleCallback(() => void run(), { timeout: 2000 }) : window.setTimeout(() => void run(), 1000);

  return () => {
    stopped = true;
    if (hasIdle) window.cancelIdleCallback(idle);
    else window.clearTimeout(idle);
    worker?.terminate();
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    for (const [link, { href, type }] of original) {
      if (type === null) link.removeAttribute("type");
      else link.type = type;
      link.href = href;
    }
  };
}
