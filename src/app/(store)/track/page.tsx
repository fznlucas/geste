import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackingPage } from "./TrackingPage";

export const metadata: Metadata = { title: "Tracking" };

export default function Page() {
  return (
    <Suspense>
      <TrackingPage />
    </Suspense>
  );
}
