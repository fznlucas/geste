import Image from "next/image";

export interface PrintMatProps {
  imageUrl: string;
  alt: string;
  /** "N°07 · 12/50" under the picture (desktop). */
  caption: string;
  priority?: boolean;
}

/**
 * A print on its white mat over Sand (boards Print, MPrint). Desktop: 760 px Sand panel, mat padding
 * 36 36 64, 400 × 500 picture, caption "N°07 · 12/50 · Geste Studio". Phone: 36 px Sand padding, mat
 * 16 16 32, 220 × 275 picture, no caption.
 */
export function PrintMat({ imageUrl, alt, caption, priority }: PrintMatProps) {
  return (
    <div className="flex items-center justify-center bg-surface-sunk p-36 lg:h-760 lg:p-0">
      <div className="flex flex-col gap-18 bg-surface px-16 pb-32 pt-16 shadow-mat-sm lg:px-36 lg:pb-64 lg:pt-36 lg:shadow-mat">
        <span className="relative block h-275 w-220 lg:h-500 lg:w-400">
          <Image src={imageUrl} alt={alt} fill priority={priority} sizes="(min-width: 1200px) 400px, 220px" className="object-cover" />
        </span>
        <span className="hidden justify-between text-fg-muted lg:flex">
          <span>{caption}</span>
          <span>Geste Studio</span>
        </span>
      </div>
    </div>
  );
}
