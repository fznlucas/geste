import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPage } from "./LoginPage";

export const metadata: Metadata = { title: "Log in" };

/** `?next=` and `?mode=` are read in the browser: the export needs the Suspense boundary. */
export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
