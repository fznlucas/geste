import { getEntitlementIds } from "@/lib/api";

/** Static export: the mock entitlements and `local-<guideId>` for every published guide (bought in this browser). */
export async function readerParams() {
  return (await getEntitlementIds()).map((entitlementId) => ({ entitlementId }));
}

export type ReaderPageProps = { params: Promise<{ entitlementId: string }> };
