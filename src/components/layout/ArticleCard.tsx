import Image from "next/image";
import Link from "next/link";

export interface ArticleCardProps {
  href: string;
  imageUrl: string;
  title: string;
  /** "Method" and "Sept 24" on one Stone line (Journal); omitted on "Keep reading". */
  category?: string;
  date?: string;
  /** Desktop only, as drawn. */
  excerpt?: string;
  /** journal: 300 px picture (phone 200). keep: 240 px picture, title + excerpt only (Article board). */
  variant?: "journal" | "keep";
}

/** Journal tile (boards Journal, MJournal, Article "Keep reading"): the title underlines on hover. */
export function ArticleCard({ href, imageUrl, title, category, date, excerpt, variant = "journal" }: ArticleCardProps) {
  return (
    <Link href={href} className="group flex flex-col gap-8 lg:gap-10">
      <span className={variant === "keep" ? "relative block h-240 w-full" : "relative block h-200 w-full lg:h-300"}>
        <Image src={imageUrl} alt="" fill sizes="(min-width: 1200px) 373px, 100vw" className="object-cover" />
      </span>
      {category && (
        <span className="flex justify-between text-fg-muted">
          <span>{category}</span>
          <span>{date}</span>
        </span>
      )}
      <span className="font-medium underline-offset-3 group-hover:underline">{title}</span>
      {excerpt && <span className="hidden text-fg-muted lg:inline">{excerpt}</span>}
    </Link>
  );
}
