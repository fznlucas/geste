"use client";

import { useSearchParams } from "next/navigation";
import { WorkEditorPage } from "../_parts/WorkEditor";

export function DraftWorkPage() {
  const slug = useSearchParams().get("slug") ?? "";
  return <WorkEditorPage slug={slug} />;
}
