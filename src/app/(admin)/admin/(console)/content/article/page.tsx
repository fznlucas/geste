import type { Metadata } from "next";
import { Suspense } from "react";
import { ArticleEditor } from "./ArticleEditor";

export const metadata: Metadata = { title: "Article" };

/** /admin/content/article/?id=: a query route (drafts created in the admin have no prebuilt page). */
export default function Page() {
  return (
    <Suspense>
      <ArticleEditor />
    </Suspense>
  );
}
