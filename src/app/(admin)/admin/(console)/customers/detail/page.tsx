import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerDetailRoute } from "./CustomerDetailRoute";

export const metadata: Metadata = { title: "Customer" };

/**
 * /admin/customers/detail?id=cus-… A query, like the order detail: simulated customers appear every
 * day after the deploy and have no prebuilt page (docs/admin-v2/01). /admin/customers/[id] stays for
 * the fixture customers' old links.
 */
export default function Page() {
  return (
    <Suspense>
      <CustomerDetailRoute />
    </Suspense>
  );
}
