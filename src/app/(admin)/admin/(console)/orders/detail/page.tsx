import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetailPage } from "./OrderDetailPage";

export const metadata: Metadata = { title: "Order" };

/**
 * /admin/orders/detail?number=GS-2041. A query, not /admin/orders/[number]: orders paid at the mock
 * checkout exist only in this browser and have no prebuilt page (docs/decisions.md "Admin (M6)").
 */
export default function Page() {
  return (
    <Suspense>
      <OrderDetailPage />
    </Suspense>
  );
}
