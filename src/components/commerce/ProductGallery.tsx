"use client";

import Image from "next/image";
import { useState } from "react";

export interface GalleryImage {
  src: string;
  alt: string;
  /** "preview" = digital render, "result" = real beginner result, "studio" = Lucas's painted test. */
  kind: "preview" | "result" | "studio";
  /** CSS filter used to preview a palette on the digital render (from palettes.preview_filter). */
  filter?: string;
}

/** Large 4:5 crop, no shadow, Mist ground while loading; text thumbnails below ("Preview · Real result · Studio"). */
export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [i, setI] = useState(0);
  const cur = images[i];
  if (!cur) return null;
  const names = { preview: "Preview", result: "Real result", studio: "Studio test" } as const;
  return (
    <div className="flex flex-col gap-12">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-muted">
        <Image src={cur.src} alt={cur.alt} fill sizes="(min-width: 1200px) 560px, 100vw" className="object-cover" style={{ filter: cur.filter }} priority />
      </div>
      {images.length > 1 && (
        <div className="flex gap-14" role="tablist" aria-label="Images">
          {images.map((im, k) => (
            <button key={k} role="tab" aria-selected={k === i} type="button" onClick={() => setI(k)} className={k === i ? "min-h-32 underline underline-offset-4" : "min-h-32 text-fg-muted hover:text-fg"}>
              {names[im.kind]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
