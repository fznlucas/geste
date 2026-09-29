"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Segmented } from "../primitives/Segmented";
import type { FormatKey, Orientation } from "@/lib/pricing";

/**
 * Desktop preview size per format inside the 720 px Mist box (board Product): bigger canvas, bigger
 * picture. The long side of the work: its height when portrait, its width when landscape.
 */
const PREVIEW_SIZE: Record<FormatKey, number> = { "30x40": 440, "40x50": 520, "60x80": 580, "80x100": 660 };

export interface ProductGalleryProps {
  workNumber: string; // "N°03"
  imageUrl: string;
  /** CSS filter previewing the palette on the digital render (palettes.preview_filter). */
  filter: string | null;
  format: FormatKey;
  orientation?: Orientation;
  /** "Original palette, 60×80" under the picture (desktop). */
  caption: string;
  /** Photo of the work painted by a first-time painter; null → dashed placeholder, as on the boards. */
  resultPhotoUrl: string | null;
  priority?: boolean;
}

/**
 * Work page picture (boards Product, MProduct): the work straight on the page with a "Digital preview" / "Real result" badge on its corner,
 * views "Preview · Real result" below. Desktop: 720 px box, the render's long side follows the format
 * and its filter the palette (both animate 420 ms). Phone: full width (landscape) or up to 440 px
 * tall (portrait). The work is always whole, never cropped, and has no ground behind it.
 */
export function ProductGallery({ workNumber, imageUrl, filter, format, orientation = "portrait", caption, resultPhotoUrl, priority }: ProductGalleryProps) {
  const [view, setView] = useState<"preview" | "result">("preview");
  const preview = view === "preview";
  const landscape = orientation === "landscape";
  return (
    <div className="flex flex-col gap-22 lg:gap-14">
      {/* The work straight on the page, whole (no ground): the badge sits on its top-left corner. */}
      <div className="flex items-center justify-center lg:h-720">
        <div className="relative w-full lg:w-auto">
          <span className="absolute left-10 top-10 bg-bg px-7 py-3 lg:left-16 lg:top-16 lg:px-8 lg:py-5 lg:leading-[14px]">
            {preview ? "Digital preview" : "Real result"}
          </span>
          {preview ? (
            <Image
              src={imageUrl}
              alt={`Digital preview of ${workNumber} in the selected palette`}
              width={0}
              height={0}
              sizes="(min-width: 1200px) 660px, 100vw"
              priority={priority}
              className={
                landscape
                  ? "block h-auto w-full transition-[width,filter] duration-panel ease-standard lg:w-(--preview-size)"
                  : "mx-auto block h-auto max-h-440 w-auto max-w-full transition-[height,filter] duration-panel ease-standard lg:h-(--preview-size) lg:max-h-none"
              }
              style={{ filter: filter ?? "none", "--preview-size": `${PREVIEW_SIZE[format]}px` } as CSSProperties}
            />
          ) : resultPhotoUrl ? (
            <Image src={resultPhotoUrl} alt={`${workNumber} painted by a first-time painter`} width={0} height={0} sizes="(min-width: 1200px) 560px, 100vw" className="mx-auto block h-auto max-h-440 w-auto max-w-full lg:h-520 lg:max-h-none" />
          ) : (
            <div className="flex h-440 w-full items-center justify-center border border-dashed border-border-dashed p-24 text-center text-fg-muted lg:h-520 lg:w-420">
              [Photo of {workNumber} painted by a first-time painter<span className="hidden lg:inline">, same guide</span>]
            </div>
          )}
        </div>
      </div>
      {/* Board Product: the caption sits at the top of the 32 px row, in the normal line-height. */}
      <div className="flex items-start justify-between text-fg-muted">
        <Segmented<"preview" | "result">
          label="Picture"
          gap="gap-x-16 lg:gap-x-20"
          value={view}
          onChange={setView}
          options={[{ value: "preview", label: "Preview" }, { value: "result", label: "Real result" }]}
        />
        <span className="hidden leading-[normal] lg:inline">{preview ? caption : "Same guide, first-time painter"}</span>
      </div>
    </div>
  );
}
