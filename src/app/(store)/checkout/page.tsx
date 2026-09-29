import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutFlow } from "./CheckoutFlow";

export const metadata: Metadata = { title: "Checkout" };

/** Client page (cart and session live in the browser in the mock); `?paymentOutcome=` needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <CheckoutFlow />
    </Suspense>
  );
}
