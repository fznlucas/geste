import type { Metadata } from "next";
import { MarketingPage } from "./MarketingPage";

export const metadata: Metadata = { title: "Marketing" };

export default function Page() {
  return <MarketingPage />;
}
