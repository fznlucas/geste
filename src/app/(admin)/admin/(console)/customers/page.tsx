import type { Metadata } from "next";
import { CustomersPage } from "./CustomersPage";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return <CustomersPage />;
}
