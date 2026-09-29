"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getLibrary } from "@/lib/api";
import { progressStore, useRequireCustomer } from "@/lib/client";
import { readerPath } from "./ReaderApp";

/** Opens the last guide touched on this device (progress `updatedAt`), else the first guide in progress, else the Library. */
export function LearnHome() {
  const router = useRouter();
  const auth = useRequireCustomer();
  const userId = auth.status === "signed_in" ? auth.session.userId : null;

  useEffect(() => {
    if (!userId) return;
    void getLibrary(userId).then((items) => {
      const progress = progressStore.get();
      const touched = items
        .filter((i) => progress[i.entitlementId])
        .sort((a, b) => progress[b.entitlementId]!.updatedAt.localeCompare(progress[a.entitlementId]!.updatedAt));
      const pick = touched[0] ?? items.find((i) => i.state === "in_progress") ?? null;
      router.replace(pick ? readerPath.step(pick.entitlementId) : "/account");
    });
  }, [userId, router]);

  return (
    <div aria-busy="true" className="flex h-dvh flex-col gap-16 p-16 lg:p-32">
      <span className="sr-only">Opening your guide</span>
      <div className="h-28 bg-surface-muted" />
      <div className="flex-1 bg-surface-muted" />
    </div>
  );
}
