import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersPage } from "./OrdersPage";

export const metadata: Metadata = { title: "Orders" };

/** `?q=` (top-bar search) is read in the browser: the export needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <OrdersPage />
    </Suspense>
  );
}
