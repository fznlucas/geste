import Link from "next/link";
import type { Orientation } from "@/lib/pricing";
import { Artwork } from "./Artwork";

export interface PrintCardProps {
  href: string;
  imageUrl: string;
  orientation?: Orientation;
  /** "N°01 print" */
  title: string;
  /** "from $55" */
  price: string;
  /** "4/100" */
  note: string;
}

/** Print tile (board Print, "Other editions", desktop): Sand mat with 24 px padding, the work whole in its 212 × 265 frame, title + price, edition in Stone. */
export function PrintCard({ href, imageUrl, orientation, title, price, note }: PrintCardProps) {
  return (
    <Link href={href} className="group flex flex-col gap-10">
      <span className="block bg-surface-sunk p-24">
        {/* Fixed 212 × 265 as drawn: the Sand mat is wider than the picture, which sits top-left. */}
        <Artwork src={imageUrl} orientation={orientation} frame="card" ground="none" className="w-212" sizes="212px" />
      </span>
      <span className="flex justify-between">
        <span className="underline-offset-3 group-hover:underline">{title}</span>
        <span>{price}</span>
      </span>
      <span className="text-fg-muted">{note}</span>
    </Link>
  );
}
