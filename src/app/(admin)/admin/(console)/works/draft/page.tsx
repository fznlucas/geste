import type { Metadata } from "next";
import { Suspense } from "react";
import { DraftWorkPage } from "./DraftWorkPage";

export const metadata: Metadata = { title: "New work" };

/**
 * Works created in the admin ("New work", AI approvals) have no prebuilt page in the static export:
 * their editor is /admin/works/draft?slug=n16 (docs/decisions.md "Admin (M6)").
 */
export default function Page() {
  return (
    <Suspense>
      <DraftWorkPage />
    </Suspense>
  );
}
