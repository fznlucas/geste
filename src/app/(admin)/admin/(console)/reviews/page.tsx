import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsPage } from "./ReviewsPage";

export const metadata: Metadata = { title: "Reviews & results" };

export default function Page() {
  // Filters in the URL are read in the browser: the export needs the Suspense boundary.
  return (
    <Suspense>
      <ReviewsPage />
    </Suspense>
  );
}
