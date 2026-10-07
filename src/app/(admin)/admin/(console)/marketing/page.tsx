import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingPage } from "./MarketingPage";

export const metadata: Metadata = { title: "Marketing" };

export default function Page() {
  // `?tab=` is read in the browser: the export needs the Suspense boundary.
  return (
    <Suspense>
      <MarketingPage />
    </Suspense>
  );
}
