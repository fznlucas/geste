import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsPage } from "./AnalyticsPage";

export const metadata: Metadata = { title: "Analytics" };

/** `?range=` and `?work=` are read in the browser: the export needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <AnalyticsPage />
    </Suspense>
  );
}
