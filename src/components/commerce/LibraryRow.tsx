"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ButtonLink } from "../primitives/Button";
import { ProgressBar } from "../primitives/ProgressBar";

export interface LibraryRowProps {
  imageUrl: string;
  /** "N°03" */
  number: string;
  /** Desktop "60×80 · Intermediate · Original palette", phone "60×80 · Intermediate". */
  detail: string;
  /** 0–1 */
  progress: number;
  /** "Layer 2 of 3", "Not started", "Finished · signed 12 Sept" (phone: "Layer 2 of 3 · offline ready"). */
  status: string;
  /** "Continue", "Start", "Open" */
  action: string;
  /** The reader (/learn/[entitlementId]). */
  openHref: string;
  listHref: string;
  printsLeft: number;
  /** The print sheet (/learn/[entitlementId]/print). */
  printHref: string;
  variant?: "desktop" | "phone";
}

/**
 * One guide of the Library (Account, MAccount). Desktop: 144×180 picture, "Available offline",
 * 2 px progress line with its status, Continue / Shopping list / Print · n left. Phone: 96×120
 * picture, status under the line, three text links.
 */
export function LibraryRow({ imageUrl, number, detail, progress, status, action, openHref, listHref, printsLeft, printHref, variant = "desktop" }: LibraryRowProps) {
  const bar = <ProgressBar variant="line" value={Math.round(progress * 100)} label={`${number} progress`} className={variant === "desktop" ? "flex-1" : undefined} />;
  if (variant === "phone") {
    const link = "-my-2 py-2 underline underline-offset-3 hover:text-fg-muted";
    return (
      <div className="flex gap-14 border-b border-border py-16">
        <Thumb src={imageUrl} w={96} h={120} />
        <div className="flex flex-1 flex-col gap-6">
          <span className="font-medium">{number}</span>
          <span className="text-fg-muted">{detail}</span>
          {bar}
          <span className="text-fg-muted">{status}</span>
          <div className="mt-auto flex gap-12">
            <Link href={openHref} className={link} aria-label={`${action} ${number}`}>{action}</Link>
            <Link href={listHref} className={link} aria-label={`Shopping list for ${number}`}>List</Link>
            <Link href={printHref} className={cn(link, printsLeft <= 0 && "text-fg-muted")} aria-label={`Print ${number}, ${printsLeft} left`}>
              Print
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-20 border-t border-border py-20">
      <Thumb src={imageUrl} w={144} h={180} />
      <div className="flex flex-1 flex-col gap-6">
        <div className="flex justify-between">
          <span className="font-medium">{number}</span>
          <span className="text-fg-muted">Available offline</span>
        </div>
        <span className="text-fg-muted">{detail}</span>
        <div className="mt-6 flex items-center gap-12">
          {bar}
          <span>{status}</span>
        </div>
        <div className="mt-auto flex items-center gap-10">
          <ButtonLink href={openHref} className="min-w-160" trailing="→" aria-label={`${action} ${number}`}>{action}</ButtonLink>
          <ButtonLink href={listHref} variant="ghost">Shopping list</ButtonLink>
          <ButtonLink href={printHref} variant="ghost">
            Print · {printsLeft} left
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Thumb({ src, w, h }: { src: string; w: number; h: number }) {
  return (
    <span className="relative block shrink-0 bg-surface-sunk" style={{ width: w, height: h }}>
      <Image src={src} alt="" fill sizes={`${w}px`} className="object-cover" />
    </span>
  );
}
