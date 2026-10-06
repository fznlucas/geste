import type { Metadata } from "next";
import { Suspense } from "react";
import { FinancePage } from "./FinancePage";

export const metadata: Metadata = { title: "Finance" };

/** Period and tab live in the URL (`?period=2026-09&tab=taxes`): read in the browser, hence Suspense. */
export default function Page() {
  return (
    <Suspense>
      <FinancePage />
    </Suspense>
  );
}
