"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Segmented } from "../primitives/Segmented";
import type { FormatKey } from "@/lib/pricing";

/** Desktop preview height per format inside the 720 px Mist box (board Product): bigger canvas, bigger picture. */
const PREVIEW_HEIGHT: Record<FormatKey, number> = { "30x40": 440, "40x50": 520, "60x80": 580, "80x100": 660 };

export interface ProductGalleryProps {
  workNumber: string; // "N°03"
  imageUrl: string;
  /** CSS filter previewing the palette on the digital render (palettes.preview_filter). */
  filter: string | null;
  format: FormatKey;
  /** "Original palette, 60×80" under the picture (desktop). */
  caption: string;
  /** Photo of the work painted by a first-time painter; null → dashed placeholder, as on the boards. */
  resultPhotoUrl: string | null;
  priority?: boolean;
}

/**
 * Work page picture (boards Product, MProduct): Mist box with a "Digital preview" / "Real result" badge,
 * views "Preview · Real result" below. Desktop: 720 px box, the render's height follows the format and
 * its filter the palette (both animate 420 ms). Phone: full-width 358 × 440 crop.
 */
export function ProductGallery({ workNumber, imageUrl, filter, format, caption, resultPhotoUrl, priority }: ProductGalleryProps) {
  const [view, setView] = useState<"preview" | "result">("preview");
  const preview = view === "preview";
  return (
    <div className="flex flex-col gap-22 lg:gap-14">
      <div className="relative flex items-center justify-center bg-surface-muted lg:h-720">
        <span className="absolute left-10 top-10 bg-bg px-7 py-3 lg:left-16 lg:top-16 lg:px-8 lg:py-5 lg:leading-[14px]">
          {preview ? "Digital preview" : "Real result"}
        </span>
        {preview ? (
          <Image
            src={imageUrl}
            alt={`Digital preview of ${workNumber} in the selected palette`}
            width={0}
            height={0}
            sizes="(min-width: 1200px) 560px, 100vw"
            priority={priority}
            className="aspect-[358/440] w-full object-cover transition-[height,filter] duration-panel ease-standard lg:aspect-auto lg:h-(--preview-h) lg:w-auto"
            style={{ filter: filter ?? "none", "--preview-h": `${PREVIEW_HEIGHT[format]}px` } as CSSProperties}
          />
        ) : resultPhotoUrl ? (
          <Image src={resultPhotoUrl} alt={`${workNumber} painted by a first-time painter`} width={0} height={0} sizes="(min-width: 1200px) 560px, 100vw" className="aspect-[358/440] w-full object-cover lg:aspect-auto lg:h-520 lg:w-auto" />
        ) : (
          <div className="flex h-440 w-full items-center justify-center border border-dashed border-border-dashed p-24 text-center text-fg-muted lg:h-520 lg:w-420">
            [Photo of {workNumber} painted by a first-time painter<span className="hidden lg:inline">, same guide</span>]
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-fg-muted">
        <Segmented<"preview" | "result">
          label="Picture"
          gap="gap-x-16 lg:gap-x-20"
          value={view}
          onChange={setView}
          options={[{ value: "preview", label: "Preview" }, { value: "result", label: "Real result" }]}
        />
        <span className="hidden lg:inline">{preview ? caption : "Same guide, first-time painter"}</span>
      </div>
    </div>
  );
}
