/** Step view — boards GuideReader, AppStep (docs/screens/reader.md). Private: static shell, the guide loads in the browser. */
import type { Metadata } from "next";
import { Suspense } from "react";
import { ReaderApp } from "../_reader/ReaderApp";
import { readerParams, type ReaderPageProps } from "../_reader/params";

export const dynamicParams = false;
export const generateStaticParams = readerParams;
export const metadata: Metadata = { title: "Guide" };

export default async function Page({ params }: ReaderPageProps) {
  const { entitlementId } = await params;
  return (
    <Suspense>
      <ReaderApp id={entitlementId} route="step" />
    </Suspense>
  );
}
