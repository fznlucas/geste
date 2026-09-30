"use client";

import Image from "next/image";
import { AppIcon, faviconFrameSvg, faviconLoop, svgDataUrl } from "@/components";
import { FAVICON } from "@/lib/motion";

const LOOP = faviconLoop();

/** One loop of the animated favicon, image by image, at `size` px (the canvas draws exactly these SVGs). */
function Strip({ size }: { size: 16 | 32 }) {
  return (
    <div role="img" aria-label={`The ${LOOP.length} images of one favicon loop at ${size} px`} className="flex flex-wrap gap-4">
      {LOOP.map((f, i) => (
        <Image key={i} src={svgDataUrl(faviconFrameSvg(size, f))} alt="" width={size} height={size} unoptimized />
      ))}
    </div>
  );
}

/** AnimatedFavicon (docs/decisions.md "Animated favicon"): the loop's images, and the static state. */
export function FaviconKit() {
  const s = (ms: number) => `${(ms / 1000).toFixed(2).replace(/0$/, "")} s`;
  return (
    <div className="flex flex-col gap-24">
      <div className="flex flex-col gap-10">
        <span className="text-fg-muted">
          Animated favicon · one loop, {FAVICON.fps} images a second: draw {s(FAVICON.draw)} (the logo&apos;s two strokes of the g), hold {s(FAVICON.hold)}, erase backwards {s(FAVICON.erase)}, rest {s(FAVICON.pause)} · 32 px (Retina)
        </span>
        <Strip size={32} />
      </div>
      <div className="flex flex-col gap-10">
        <span className="text-fg-muted">Animated favicon · 16 px (standard screens)</span>
        <Strip size={16} />
      </div>
      <div className="flex flex-col gap-10">
        <span className="text-fg-muted">Static · prefers-reduced-motion, Safari, touch-only devices: the favicon as it is</span>
        <div className="flex items-end gap-16"><AppIcon size={16} /><AppIcon size={32} /></div>
      </div>
    </div>
  );
}
