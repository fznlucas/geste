"use client";

import { useSearchParams } from "next/navigation";
import { CustomerDetailPage } from "../[id]/CustomerDetailPage";

export function CustomerDetailRoute() {
  const id = useSearchParams().get("id") ?? "";
  return <CustomerDetailPage id={id} />;
}
