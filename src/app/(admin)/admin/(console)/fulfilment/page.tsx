import type { Metadata } from "next";
import { FulfilmentPage } from "./FulfilmentPage";

export const metadata: Metadata = { title: "Fulfilment" };

export default function Page() {
  return <FulfilmentPage />;
}
