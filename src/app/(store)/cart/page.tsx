import type { Metadata } from "next";
import { CartPage } from "./CartPage";

export const metadata: Metadata = { title: "Cart" };

export default function Page() {
  return <CartPage />;
}
