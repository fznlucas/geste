import type { Metadata } from "next";
import { Suspense } from "react";
import { ContentPage } from "./ContentPage";

export const metadata: Metadata = { title: "Content" };

export default function Page() {
  // `?tab=` is read in the browser: the export needs the Suspense boundary.
  return (
    <Suspense>
      <ContentPage />
    </Suspense>
  );
}
