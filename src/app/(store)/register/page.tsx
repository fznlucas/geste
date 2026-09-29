import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterPage } from "./RegisterPage";

export const metadata: Metadata = { title: "Create your account" };

export default function Page() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
}
