import Image from "next/image";
import { formatPrice } from "@/lib/format";

export interface GiftCardPreviewProps {
  imageUrl: string;
  amountCents: number;
  toName: string;
  fromName: string;
  message: string;
}

/**
 * The gift card as it is emailed (boards GiftCard, MGiftCard), over Sand. Desktop: 640 px panel, 440 px
 * card, 260 px picture, "geste.studio gift card", code line. Phone: 24 px Sand padding, 160 px picture,
 * "Gift card", no code line. Empty names show "…".
 */
export function GiftCardPreview({ imageUrl, amountCents, toName, fromName, message }: GiftCardPreviewProps) {
  return (
    <div aria-label="Preview of the gift card" role="img" className="flex items-center justify-center bg-surface-sunk p-24 lg:h-640 lg:p-0">
      <div className="flex w-full flex-col bg-bg shadow-card-sm lg:w-440 lg:shadow-card">
        <span className="relative block h-160 w-full lg:h-260">
          <Image src={imageUrl} alt="" fill sizes="(min-width: 1200px) 440px, 100vw" className="object-cover" />
        </span>
        <span className="flex flex-col gap-4 p-14 lg:gap-8 lg:px-24 lg:py-20">
          <span className="flex justify-between">
            <span className="font-medium">
              <span className="lg:hidden">Gift card</span>
              <span className="hidden lg:inline">geste<span className="text-fg-muted">.studio</span> gift card</span>
            </span>
            <span>{formatPrice(amountCents)}</span>
          </span>
          <span className="text-fg-muted">For {toName || "…"}, from {fromName || "…"}</span>
          <span className="whitespace-pre-line">{message}</span>
          <span className="hidden text-fg-muted lg:inline">Code GESTE-XXXX-XXXX · valid 12 months</span>
        </span>
      </div>
    </div>
  );
}
