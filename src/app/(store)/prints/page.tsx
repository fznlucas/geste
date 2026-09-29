/**
 * /prints — the gallery of every edition (docs/screens/store.md §Prints): the Shop's grid and cards,
 * filters Orientation and Size (in the URL), sold-out editions last. Built at deploy time.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { getPrintGallery } from "./_print/data";
import { PrintsGallery } from "./_print/PrintsGallery";

export const metadata: Metadata = { title: "Limited prints" };

export default async function Page() {
  const items = await getPrintGallery();
  return (
    <div className="mx-auto flex w-full max-w-1264 flex-col gap-20 px-16 pt-24 lg:gap-40 lg:px-32 lg:pt-72">
      <p>
        Limited prints. <span className="text-fg-muted">Our studio paintings on cotton paper, signed and numbered, in S, M and L.</span>
      </p>
      {/* useSearchParams needs a Suspense boundary in a static export; the fallback is the unfiltered grid. */}
      <Suspense fallback={<PrintsGallery items={items} static />}>
        <PrintsGallery items={items} />
      </Suspense>
    </div>
  );
}
