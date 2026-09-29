import type { Metadata } from "next";
import { Suspense } from "react";
import { SuccessPage } from "./SuccessPage";

export const metadata: Metadata = { title: "Order confirmed" };

export default function Page() {
  return (
    <Suspense>
      <SuccessPage />
    </Suspense>
  );
}
