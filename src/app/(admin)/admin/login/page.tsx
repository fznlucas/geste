import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginPage } from "./AdminLoginPage";

export const metadata: Metadata = { title: "Admin login" };

/** `?next=` is read in the browser: the export needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <AdminLoginPage />
    </Suspense>
  );
}
