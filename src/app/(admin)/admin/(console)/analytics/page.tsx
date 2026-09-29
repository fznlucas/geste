import type { Metadata } from "next";
import { AnalyticsPage } from "./AnalyticsPage";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return <AnalyticsPage />;
}
