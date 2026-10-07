"use client";

/**
 * /admin/fulfilment (AdminFulfilment): every numbered copy sold, by step (To print → Printed & signed →
 * Packed → Shipped), newest order first. Delivered copies leave the board for the "Delivered · last 14 days" list. Prints bought at checkout in this
 * browser land in "To print". Owner and Fulfilment (docs/admin.md).
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, KanbanBoard, Modal, UnderLink, useToast, type KanbanColumn } from "@/components";
import { addDays, parisDay, simNow, simToday } from "@/lib/clock";
import { adminDate } from "@/lib/dates";
import { getPrintCopies, type FulfilmentStatus, type PrintCopy } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { nextPickupLabel } from "@/lib/metrics";
import { FULFILMENT_STEPS, moveCopy } from "@/lib/client/admin/fulfilment";
import { AdminPage } from "../../_admin/AdminPage";

export function FulfilmentPage() {
  const copies = useAdminQuery(() => getPrintCopies({ fulfilment: FULFILMENT_STEPS.map((s) => s.key) }), []);
  // Delivered: the last 14 days, under the board.
  const delivered = useAdminQuery(async () => {
    const since = addDays(simToday(), -14);
    return (await getPrintCopies({ fulfilment: "delivered" })).filter((c) => c.deliveredAt && parisDay(c.deliveredAt) >= since && c.orderNumber);
  }, []);
  const [confirm, setConfirm] = useState<{ copyId: string; others: PrintCopy[] } | null>(null);
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const pickupLine = nextPickupLabel();
  // "3 prints to pack before the 16:00 pickup · 1 late" (late: paid more than 3 days ago).
  const waiting = (copies.data ?? []).filter((c) => c.fulfilment === "to_print" || c.fulfilment === "printed" || c.fulfilment === "packed");
  const late = waiting.filter((c) => c.orderPaidAt && simNow().getTime() - Date.parse(c.orderPaidAt) > 3 * 86_400_000).length;
  const subtitle = copies.status === "ready" ? `${waiting.length} ${waiting.length === 1 ? "print" : "prints"} to pack and ship${pickupLine ? ` · ${pickupLine}` : ""}${late ? ` · ${late} late` : ""}` : undefined;
  // ?col=to_print (the sidebar's count): that column in view once the cards are there.
  const col = useSearchParams().get("col");
  useEffect(() => {
    if (col && copies.status === "ready") document.getElementById(`col-${col}`)?.scrollIntoView({ block: "start" });
  }, [col, copies.status]);

  // A copy moved to Shipped takes the whole parcel: when the order has other prints, say so first.
  const ask = (copyId: string, to: string) => {
    const copy = copies.data?.find((c) => c.id === copyId);
    const others = copy?.orderNumber ? (copies.data ?? []).filter((c) => c.orderNumber === copy.orderNumber && c.id !== copyId) : [];
    if (to === "shipped" && others.length) setConfirm({ copyId, others });
    else void move(copyId, to);
  };

  const move = async (copyId: string, to: string) => {
    setConfirm(null);
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
    <AdminPage title="Fulfilment · prints" subtitle={subtitle} breadcrumbs={[{ label: "Sales", href: "/admin/orders" }]} roles={["fulfilment"]} desktopHref="/admin/fulfilment">
      <div className="flex flex-wrap justify-between gap-x-16">
        <span className="text-fg-muted">Print lab: in-house printer{pickupLine ? ` · ${pickupLine}` : ""}</span>
        <UnderLink href="/admin/editions">Edition stock</UnderLink>
      </div>
      {copies.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading" className="grid grid-cols-4 gap-16">
          {FULFILMENT_STEPS.map((s) => <div key={s.key} className="min-h-584 bg-surface-hover" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-880">
            <KanbanBoard columns={columns(copies.data)} onMove={ask} busy={busy} />
          </div>
        </div>
      )}
      {delivered.status === "ready" && delivered.data.length > 0 && (
        <details className="border border-border bg-surface p-14">
          <summary className="cursor-pointer">Delivered · last 14 days · {delivered.data.length}</summary>
          <ul className="mt-10 flex flex-col gap-8">
            {delivered.data.map((c) => (
              <li key={c.id} className="flex gap-10">
                <UnderLink href={`/admin/orders/detail?number=${c.orderNumber}`}>#{c.orderNumber}</UnderLink>
                <span>{c.workNumber} · {c.size} · {c.label}</span>
                <span className="text-fg-muted">{[c.customerName, c.city].filter(Boolean).join(" · ")} · delivered {adminDate(c.deliveredAt!)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {confirm && (
        <Modal
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Ship the whole parcel?"
          width={460}
          placement="admin"
          actions={
            <>
              <Button variant="ghost" className="grow" onClick={() => setConfirm(null)}>Cancel</Button>
              <Button className="grow-2" trailing="→" onClick={() => move(confirm.copyId, "shipped")}>Ship them together</Button>
            </>
          }
        >
          <p>The order has other prints: they leave in the same parcel.</p>
          <ul className="flex flex-col gap-4 text-fg-muted">
            {confirm.others.map((c) => <li key={c.id}>{c.workNumber} · {c.size} · {c.label} · {FULFILMENT_STEPS.find((s) => s.key === c.fulfilment)?.title}</li>)}
          </ul>
        </Modal>
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
        orientation: c.orientation,
        href: c.orderNumber ? `/admin/orders/detail?number=${c.orderNumber}` : "/admin/editions",
      })),
  }));
}
