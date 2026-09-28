import Image from "next/image";
import Link from "next/link";

export interface PrintCardProps {
  href: string;
  imageUrl: string;
  /** "N°01 print" */
  title: string;
  /** "from $45" */
  price: string;
  /** "4/50" */
  note: string;
}

/** Print tile (board Print, "Other editions", desktop): Sand mat with 24 px padding, title + price, edition in Stone. */
export function PrintCard({ href, imageUrl, title, price, note }: PrintCardProps) {
  return (
    <Link href={href} className="group flex flex-col gap-10">
      <span className="block bg-surface-sunk p-24">
        {/* Fixed 212 × 265 as drawn: the Sand mat is wider than the picture, which sits top-left. */}
        <span className="relative block h-265 w-212">
          <Image src={imageUrl} alt="" fill sizes="212px" className="object-cover" />
        </span>
      </span>
      <span className="flex justify-between">
        <span className="underline-offset-3 group-hover:underline">{title}</span>
        <span>{price}</span>
      </span>
      <span className="text-fg-muted">{note}</span>
    </Link>
  );
}
