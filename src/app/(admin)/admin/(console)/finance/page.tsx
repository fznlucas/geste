import type { Metadata } from "next";
import { FinancePage } from "./FinancePage";

export const metadata: Metadata = { title: "Finance" };

export default function Page() {
  return <FinancePage />;
}
