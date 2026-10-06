import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "./SettingsPage";

export const metadata: Metadata = { title: "Settings" };

/** The tab can be in the URL (`?tab=Simulation`): read in the browser, hence Suspense. */
export default function Page() {
  return (
    <Suspense>
      <SettingsPage />
    </Suspense>
  );
}
