import type { Metadata } from "next";
import { getCustomers } from "@/lib/api";
import { CustomerDetailPage } from "./CustomerDetailPage";

export const metadata: Metadata = { title: "Customer" };
export const dynamicParams = false;

/** One page per mock customer (local checkout orders belong to existing customers). */
export async function generateStaticParams() {
  return (await getCustomers()).map((c) => ({ id: c.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailPage id={id} />;
}
