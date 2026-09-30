import Link from "next/link";
import type { Orientation } from "@/lib/pricing";
import { FitLine } from "./FitLine";
import { PrintPaper } from "./PrintPaper";

export interface PrintCardProps {
  href: string;
  imageUrl: string;
  orientation: Orientation;
  /** "N°01 print" */
  title: string;
  /** "from $55" */
  price: string;
  /** "4/100" */
  note: string;
  /** Printed on the sheet: "N°01 · Edition of 100". */
  sheetCaption: string;
}

/**
 * Print tile (board Print, "Other editions", desktop): the work on its Sand sheet (PrintPaper), then
 * title + price and the edition in Stone, each on one line as wide as the sheet ("N°01 print" → "N°01"
 * when needed; "from $55" always stays). Width from the grid.
 */
export function PrintCard({ href, imageUrl, orientation, title, price, note, sheetCaption }: PrintCardProps) {
  const number = title.replace(/ print$/, "");
  return (
    <Link href={href} aria-label={`${title}, ${price}, ${note}`} className="group flex flex-col gap-10">
      <PrintPaper imageUrl={imageUrl} alt="" orientation={orientation} caption={sheetCaption} className="w-full" sizes="(min-width: 1200px) 400px, 50vw" />
      <span aria-hidden="true" className="flex flex-col gap-10">
        <FitLine
          variants={[
            { title, price },
            { title: number, price },
          ].map((v) => ({ left: <span className="underline-offset-3 group-hover:underline">{v.title}</span>, right: v.price }))}
        />
        <span className="text-fg-muted">{note}</span>
      </span>
    </Link>
  );
}
