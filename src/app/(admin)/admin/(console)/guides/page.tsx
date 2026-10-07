import type { Metadata } from "next";
import { Suspense } from "react";
import { GuidesPage } from "./GuidesPage";

export const metadata: Metadata = { title: "Guides" };

export default function Page() {
  return (
    <Suspense>
      <GuidesPage />
    </Suspense>
  );
}
