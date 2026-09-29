import type { Metadata } from "next";
import { LibraryPage } from "./LibraryPage";

export const metadata: Metadata = { title: "Library" };

/** Private page: static shell, the library loads in the browser for the signed-in customer (docs/mock-plan.md §2). */
export default function Page() {
  return <LibraryPage />;
}
