import Link from "next/link";
import type { Orientation } from "@/lib/pricing";
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

/** Print tile (board Print, "Other editions", desktop): the work on its Sand sheet (PrintPaper), title + price, edition in Stone. Width from the grid. */
export function PrintCard({ href, imageUrl, orientation, title, price, note, sheetCaption }: PrintCardProps) {
  return (
    <Link href={href} className="group flex flex-col gap-10">
      <PrintPaper imageUrl={imageUrl} alt="" orientation={orientation} caption={sheetCaption} className="w-full" sizes="(min-width: 1200px) 400px, 50vw" />
      <span className="flex flex-wrap justify-between gap-x-8">
        <span className="underline-offset-3 group-hover:underline">{title}</span>
        <span className="ml-auto">{price}</span>
      </span>
      <span className="text-fg-muted">{note}</span>
    </Link>
  );
}
