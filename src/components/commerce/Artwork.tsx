import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Orientation } from "@/lib/pricing";

export interface ArtworkProps {
  src: string;
  alt?: string;
  orientation?: Orientation;
  /**
   * Width / height of the image. Given, the frame takes exactly that ratio at the width of
   * `className` (grids: every work its own width). Omitted, the frame is a thumbnail slot: 4:5, turned
   * to 5:4 for a landscape work at the same width, the work fitted inside.
   */
  ratio?: number;
  /** Where the work sits in a thumbnail slot of another ratio: top-left (lists, default) or bottom centre (admin catalog grid). */
  align?: "top-left" | "bottom";
  /** Width (and anything else) of the frame: "w-64", "w-full". The height follows the ratio. */
  className?: string;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  sizes: string;
  priority?: boolean;
}

/**
 * A work's image, always whole and straight on the page: never cropped or stretched, no ground behind
 * it (docs/decisions.md "Works on Paper"). Grids pass the image's ratio; thumbnails keep a slot so
 * list columns stay aligned, the work fitted inside it.
 */
export function Artwork({ src, alt = "", orientation = "portrait", ratio, align = "top-left", className, imgClassName, imgStyle, sizes, priority }: ArtworkProps) {
  const slot = ratio ? undefined : orientation === "landscape" ? "aspect-[5/4]" : "aspect-[4/5]";
  return (
    <span className={cn("relative block shrink-0 self-start", slot, className)} style={ratio ? { aspectRatio: ratio } : undefined}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-contain", ratio ? undefined : align === "bottom" ? "object-bottom" : "object-left-top", imgClassName)}
        style={imgStyle}
      />
    </span>
  );
}
