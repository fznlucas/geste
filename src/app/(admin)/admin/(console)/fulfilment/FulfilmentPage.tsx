"use client";

/**
 * /admin/fulfilment (AdminFulfilment): every numbered copy sold, by step (To print → Printed & signed →
 * Packed → Shipped), newest order first. Delivered copies leave the board. Prints bought at checkout in this
 * browser land in "To print". Owner and Fulfilment (docs/admin.md).
 */
import { useState } from "react";
import { KanbanBoard, UnderLink, useToast, type KanbanColumn } from "@/components";
import { getPrintCopies, type FulfilmentStatus, type PrintCopy } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { FULFILMENT_STEPS, moveCopy } from "@/lib/client/admin/fulfilment";
import { AdminPage } from "../../_admin/AdminPage";

export function FulfilmentPage() {
  const copies = useAdminQuery(() => getPrintCopies({ fulfilment: FULFILMENT_STEPS.map((s) => s.key) }), []);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const move = async (copyId: string, to: string) => {
    setBusy(copyId);
    try {
      await moveCopy(copyId, to as FulfilmentStatus);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not move this print.", { tone: "danger" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminPage title="Fulfilment · prints" breadcrumbs={[{ label: "Sales", href: "/admin/orders" }]} roles={["fulfilment"]} desktopHref="/admin/fulfilment">
      <div className="flex flex-wrap justify-between gap-x-16">
        <span className="text-fg-muted">Print lab: in-house printer · next pickup by Colissimo today 16:00</span>
        <UnderLink href="/admin/editions">Edition stock</UnderLink>
      </div>
      {copies.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading" className="grid grid-cols-4 gap-16">
          {FULFILMENT_STEPS.map((s) => <div key={s.key} className="min-h-584 bg-surface-hover" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-880">
            <KanbanBoard columns={columns(copies.data)} onMove={move} busy={busy} />
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function columns(copies: PrintCopy[]): KanbanColumn[] {
  return FULFILMENT_STEPS.map((s, i) => ({
    key: s.key,
    title: s.title,
    nextLabel: FULFILMENT_STEPS[i + 1]?.title,
    cards: copies
      .filter((c) => c.fulfilment === s.key)
      .map((c) => ({
        id: c.id,
        label: c.orderNumber ? `#${c.orderNumber}` : c.certificateNo ?? c.label,
        title: `${c.workNumber} · ${c.size} · ${c.label}`,
        subtitle: [c.customerName, c.city].filter(Boolean).join(" · "),
        imageUrl: c.imageUrl,
        href: c.orderNumber ? `/admin/orders/detail?number=${c.orderNumber}` : "/admin/editions",
      })),
  }));
}
