import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Orientation } from "@/lib/pricing";

export interface PrintMatProps {
  imageUrl: string;
  alt: string;
  /** "N°07 · 12/100" under the picture (desktop). */
  caption: string;
  orientation?: Orientation;
  priority?: boolean;
}

/**
 * A print on its white mat over Sand (boards Print, MPrint). Desktop: 760 px Sand panel, mat padding
 * 36 36 64, 400 × 500 picture (500 × 400 for a landscape work), caption "N°07 · 12/100 · Geste Studio".
 * Phone: 36 px Sand padding, mat 16 16 32, 220 × 275 picture (250 × 200 landscape), no caption.
 * The work is whole: a picture of another ratio gets a wider white margin, never a crop.
 */
export function PrintMat({ imageUrl, alt, caption, orientation = "portrait", priority }: PrintMatProps) {
  const landscape = orientation === "landscape";
  return (
    <div className="flex items-center justify-center bg-surface-sunk p-36 lg:h-760 lg:p-0">
      <div className="flex flex-col gap-18 bg-surface px-16 pb-32 pt-16 shadow-mat-sm lg:px-36 lg:pb-64 lg:pt-36 lg:shadow-mat">
        <span className={cn("relative block", landscape ? "h-200 w-250 lg:h-400 lg:w-500" : "h-275 w-220 lg:h-500 lg:w-400")}>
          <Image src={imageUrl} alt={alt} fill priority={priority} sizes={landscape ? "(min-width: 1200px) 500px, 250px" : "(min-width: 1200px) 400px, 220px"} className="object-contain" />
        </span>
        <span className="hidden justify-between text-fg-muted lg:flex">
          <span>{caption}</span>
          <span>Geste Studio</span>
        </span>
      </div>
    </div>
  );
}
