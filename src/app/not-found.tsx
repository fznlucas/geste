import type { Metadata } from "next";
import { ButtonLink, CanvasDiagram } from "@/components";
import { N03_STROKES } from "@/components/reader/sampleN03";
import { StoreChrome } from "./(store)/_chrome/StoreChrome";

export const metadata: Metadata = { title: "Page not found" };

/** Boards NotFound / MNotFound. Exported as 404.html, which GitHub Pages serves for unknown paths. */
export default function NotFound() {
  return (
    <StoreChrome>
      <div className="flex flex-1 flex-col items-center justify-center gap-16 px-16 py-64 text-center md:gap-20">
        <CanvasDiagram strokes={N03_STROKES} upTo={1} width={120} />
        <span className="text-fg-muted">404</span>
        <h1 className="text-lg">This page wandered off.</h1>
        <span className="hidden text-fg-muted md:block">Like a stroke that went too far. Let us take you back.</span>
        <div className="hidden gap-12 md:flex">
          <ButtonLink href="/" variant="ghost" className="min-w-140">Home</ButtonLink>
          <ButtonLink href="/shop" trailing="→" className="min-w-200">Browse works</ButtonLink>
        </div>
        <div className="flex w-full flex-col gap-16 md:hidden">
          <ButtonLink href="/" trailing="→" fullWidth>Back home</ButtonLink>
          <ButtonLink href="/shop" variant="ghost" fullWidth>Browse works</ButtonLink>
        </div>
      </div>
    </StoreChrome>
  );
}
