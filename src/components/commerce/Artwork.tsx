import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Orientation } from "@/lib/pricing";

export interface ArtworkProps {
  src: string;
  alt?: string;
  orientation?: Orientation;
  /**
   * card = the grids' 4:5 frame whatever the orientation (Shop, Home, Prints, admin catalog).
   * turn = the frame turns with the work: 4:5 portrait, 5:4 landscape at the same width (thumbnails).
   */
  frame?: "card" | "turn";
  /** Width (and anything else) of the frame: "w-64", "w-full". The height follows the frame's ratio. */
  className?: string;
  imgClassName?: string;
  imgStyle?: CSSProperties;
  sizes: string;
  priority?: boolean;
  /** Ground around the work: Mist (default) or none, when the frame sits on a mat that is its ground. */
  ground?: "mist" | "none";
}

/**
 * A work's image, always whole: centred in its frame, never cropped or stretched (docs/decisions.md
 * "Orientation"). The frame is 4:5 in grids; thumbnails turn it to 5:4 for a landscape work.
 */
export function Artwork({ src, alt = "", orientation = "portrait", frame = "turn", className, imgClassName, imgStyle, sizes, priority, ground = "mist" }: ArtworkProps) {
  const landscape = frame === "turn" && orientation === "landscape";
  return (
    <span className={cn("relative block shrink-0 self-start overflow-hidden", landscape ? "aspect-[5/4]" : "aspect-[4/5]", ground === "mist" && "bg-surface-muted", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-contain", imgClassName)} style={imgStyle} />
    </span>
  );
}
