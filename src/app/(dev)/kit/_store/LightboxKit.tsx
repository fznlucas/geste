"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { LightboxZoom, PrintPaper, type LightboxZoomProps } from "@/components";
import { asset } from "@/lib/asset";

/** One ground of the kit with its Zoom button; a click on the picture opens it too. */
function Demo({ label, ground, ratio, picture, zoomed, ...rest }: { label: string; ground: "mist" | "sand"; ratio: number; picture: (sizes: string) => ReactNode; zoomed?: ReactNode } & Pick<LightboxZoomProps, "title" | "initialZoomed" | "status">) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-10">
      <span className="text-fg-muted">{label}</span>
      <div className={`relative flex h-240 items-center justify-center ${ground === "mist" ? "bg-surface-muted" : "bg-surface-sunk"}`}>
        <span onClick={() => setOpen(true)} className="relative block h-160 cursor-zoom-in" style={{ aspectRatio: ratio }}>
          {picture("160px")}
        </span>
        <LightboxZoom open={open} onOpenChange={setOpen} ratio={ratio} className="absolute bottom-0 right-0" {...rest}>
          {zoomed ?? picture("250vw")}
        </LightboxZoom>
      </div>
    </div>
  );
}

function work(src: string) {
  return function WorkPicture(sizes: string) {
    return <Image src={asset(src)} alt="N°08, digital preview" fill sizes={sizes} className="object-cover" />;
  };
}
const sheet = (sizes: string) => <PrintPaper imageUrl={asset("mock/work-07.jpg")} alt="N°07, limited print" orientation="landscape" caption="N°07 · 12/100" captionAlways tone="white" ratio={42 / 30} className="h-full w-full" sizes={sizes} />;

/**
 * LightboxZoom in every state: the Zoom button (default; hover Stone; focus ring on its Paper square;
 * press Enter), open whole, open zoomed ×2.5, loading (Mist block, no spinner), error ("Try again").
 */
export function LightboxKit() {
  return (
    <div className="grid grid-cols-3 gap-40">
      <Demo label="Lightbox zoom · button on the Mist ground (work page): opens whole; click to zoom ×2.5, the picture follows the cursor; pinch or double-tap on a phone" ground="mist" ratio={50 / 60} title="N°08, digital preview" picture={work("mock/work-08.jpg")} />
      <Demo label="Lightbox zoom · button on the Sand ground (print page): the whole white sheet, margin and number" ground="sand" ratio={42 / 30} title="N°07, limited print, S" picture={sheet} />
      <Demo label="Lightbox zoom · opens zoomed ×2.5 on the centre (arrows move, Enter zooms out)" ground="mist" ratio={50 / 60} title="N°08, digital preview" picture={work("mock/work-08.jpg")} initialZoomed />
      <Demo label="Lightbox zoom · loading: a Mist block where the picture goes, no spinner" ground="mist" ratio={50 / 60} title="N°08, digital preview" picture={work("mock/work-08.jpg")} status="loading" />
      <Demo label="Lightbox zoom · error: the full picture did not load, Try again" ground="mist" ratio={50 / 60} title="N°08, digital preview" picture={work("mock/work-08.jpg")} zoomed={work("mock/missing.jpg")("250vw")} />
    </div>
  );
}
