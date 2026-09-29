import type { Metadata } from "next";
import { CatalogPage } from "./_parts/CatalogPage";

export const metadata: Metadata = { title: "Works" };

export default function Page() {
  return <CatalogPage />;
}
