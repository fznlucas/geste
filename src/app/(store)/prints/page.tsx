/**
 * /prints — no board of its own: it shows the leading print (N°07), as drawn on the Print board, whose
 * "Other editions" lead to the rest (docs/decisions.md).
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { getPrintPage, printSlugs } from "./_print/data";
import { PrintPage } from "./_print/PrintPage";

export const metadata: Metadata = { title: "Limited prints" };

export default async function Page() {
  const [first] = await printSlugs();
  const data = first ? await getPrintPage(first) : null;
  if (!data) return null;
  return (
    <Suspense fallback={<PrintPage {...data} static />}>
      <PrintPage {...data} />
    </Suspense>
  );
}
