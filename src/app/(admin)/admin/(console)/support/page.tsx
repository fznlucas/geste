import type { Metadata } from "next";
import { Suspense } from "react";
import { SupportPage } from "./SupportPage";

export const metadata: Metadata = { title: "Support inbox" };

/** `?thread=` / `?customer=&about=` are read in the browser: the export needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <SupportPage />
    </Suspense>
  );
}
