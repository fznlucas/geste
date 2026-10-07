import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogPage } from "./_parts/CatalogPage";

export const metadata: Metadata = { title: "Works" };

/** `?sort=sales` is read in the browser: the export needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <CatalogPage />
    </Suspense>
  );
}
