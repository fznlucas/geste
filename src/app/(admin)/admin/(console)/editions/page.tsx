import type { Metadata } from "next";
import { Suspense } from "react";
import { EditionsPage } from "./EditionsPage";

export const metadata: Metadata = { title: "Print editions" };

export default function Page() {
  // Filters in the URL are read in the browser: the export needs the Suspense boundary.
  return (
    <Suspense>
      <EditionsPage />
    </Suspense>
  );
}
