import type { Metadata } from "next";
import { getCustomers } from "@/lib/api";
import { CustomerDetailPage } from "./CustomerDetailPage";

export const metadata: Metadata = { title: "Customer" };
export const dynamicParams = false;

/** One page per fixture customer (their old links); every customer opens at /admin/customers/detail?id=. */
export async function generateStaticParams() {
  return (await getCustomers()).filter((c) => !c.id.startsWith("cus-s")).map((c) => ({ id: c.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailPage id={id} />;
}
