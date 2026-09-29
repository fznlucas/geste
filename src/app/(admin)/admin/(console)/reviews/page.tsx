import type { Metadata } from "next";
import { ReviewsPage } from "./ReviewsPage";

export const metadata: Metadata = { title: "Reviews & results" };

export default function Page() {
  return <ReviewsPage />;
}
