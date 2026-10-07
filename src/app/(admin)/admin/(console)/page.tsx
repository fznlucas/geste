import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPage } from "./_dashboard/DashboardPage";

export const metadata: Metadata = { title: "Dashboard" };

/** `?range=` is read in the browser: the export needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
