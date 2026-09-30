"use client";

import Image from "next/image";
import { useState } from "react";
import { Segmented } from "../primitives/Segmented";
import { LARGEST_CANVAS_CM } from "@/lib/pricing";
import { stageStyle } from "./stageScale";

export interface ProductGalleryProps {
  workNumber: string; // "N°03"
  imageUrl: string;
  /** CSS filter previewing the palette on the digital render (palettes.preview_filter). */
  filter: string | null;
  /** [width, height] in cm of the selected canvas, turned for a landscape work (WorkFormat.cm). */
  canvasCm: readonly [number, number];
  /** "Original palette, 60×80" under the picture (desktop). */
  caption: string;
  /** Photo of the work painted by a first-time painter; null → dashed placeholder, as on the boards. */
  resultPhotoUrl: string | null;
  priority?: boolean;
}

/**
 * Work page picture (boards Product, MProduct): the Mist ground of the board (720 px high on 7 columns;
 * 440 px on phones), always the same size, with the "Digital preview" / "Real result" badge in its
 * top-left corner and the views "Preview · Real result" below it. The preview is the selected canvas at
 * its exact proportions (the image covers it, centred), drawn in centimetres on the catalog's common
 * scale: 80×100 fills the inner 80 %, every canvas at least 35 % of the ground's height
 * (stageScale.ts). Size and palette changes animate (base, 240 ms), off under reduced motion.
 */
export function ProductGallery({ workNumber, imageUrl, filter, canvasCm, caption, resultPhotoUrl, priority }: ProductGalleryProps) {
  const [view, setView] = useState<"preview" | "result">("preview");
  const preview = view === "preview";
  return (
    <div className="flex flex-col gap-22 lg:gap-14">
      <div data-stage className="relative flex h-440 items-center justify-center bg-surface-muted @container-[size] lg:h-720">
        {preview ? (
          <span
            data-canvas
            className="relative block transition-[height,filter] duration-base ease-standard motion-reduce:transition-none"
            style={{ ...stageStyle(canvasCm, LARGEST_CANVAS_CM), filter: filter ?? "none" }}
          >
            <Image
              src={imageUrl}
              alt={`Digital preview of ${workNumber} in the selected palette`}
              fill
              sizes="(min-width: 1200px) 560px, 290px"
              priority={priority}
              className="object-cover"
            />
          </span>
        ) : resultPhotoUrl ? (
          <Image src={resultPhotoUrl} alt={`${workNumber} painted by a first-time painter`} width={0} height={0} sizes="(min-width: 1200px) 560px, 100vw" className="block h-full w-auto max-w-full object-contain lg:h-520" />
        ) : (
          <div className="flex h-440 w-full items-center justify-center border border-dashed border-border-dashed p-24 text-center text-fg-muted lg:h-520 lg:w-420">
            [Photo of {workNumber} painted by a first-time painter<span className="hidden lg:inline">, same guide</span>]
          </div>
        )}
        <span className="absolute left-10 top-10 bg-bg px-7 py-3 lg:left-16 lg:top-16 lg:px-8 lg:py-5 lg:leading-[14px]">
          {preview ? "Digital preview" : "Real result"}
        </span>
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
