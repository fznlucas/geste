import type { Metadata } from "next";
import { Suspense } from "react";
import { FulfilmentPage } from "./FulfilmentPage";

export const metadata: Metadata = { title: "Fulfilment" };

export default function Page() {
  // Filters in the URL are read in the browser: the export needs the Suspense boundary.
  return (
    <Suspense>
      <FulfilmentPage />
    </Suspense>
  );
}
