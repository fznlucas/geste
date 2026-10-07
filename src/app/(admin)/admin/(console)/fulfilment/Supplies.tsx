"use client";

/**
 * Fulfilment › Supplies (docs/admin-v2/04 Fulfilment, "Supplies line"): tubes, paper S/M/L and certificate
 * cards left, each with its reorder level; "Reorder" emails the supplier (Outbox) and books the purchase.
 * Low (at or under the level, nothing on its way) is said in words and raises an alert.
 */
import { useState } from "react";
import { AdminBox, AdminRow, AdminTitle, PillButton, StatusChip, UnderLink, canOpenAdmin, useToast } from "@/components";
import { getSupplies, supplier, type SupplyItem } from "@/lib/api";
import { hasRole, useAdminQuery } from "@/lib/client";
import { reorderSupply } from "@/lib/client/admin/fulfilment";
import { adminDate } from "@/lib/dates";
import { useAdmin } from "../../_admin/AdminFrame";

const COLS = "120px 110px 1fr auto";
const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

export function Supplies() {
  const q = useAdminQuery(getSupplies, []);
  const { staff } = useAdmin();
  const canOrder = hasRole(staff.role, "fulfilment");
  if (q.status === "loading") return <div aria-busy="true" aria-label="Loading supplies" className="h-120 bg-surface-muted" />;
  const low = q.data.filter((s) => s.low);
  return (
    <AdminBox id="supplies" className="scroll-mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-16">
        <AdminTitle>Supplies</AdminTitle>
        <span className="text-fg-muted">{low.length ? `${low.length} to reorder` : "Nothing to reorder"} · supplier {supplier().name}</span>
      </div>
      <div role="table" aria-label="Supplies" className="flex flex-col">
        {q.data.map((s) => <SupplyRow key={s.key} s={s} canOrder={canOrder} />)}
      </div>
      <span className="text-fg-muted">Paper and a certificate per copy printed (paper only at the studio), a tube per parcel. Stock at launch, levels and prices: to confirm with the supplier.{canOpenAdmin(staff.role, "/admin/settings") && <> <UnderLink href="/admin/settings?tab=Integrations">Reorder emails in the Outbox</UnderLink></>}</span>
    </AdminBox>
  );
}

function SupplyRow({ s, canOrder }: { s: SupplyItem; canOrder: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const reorder = async () => {
    setBusy(true);
    try {
      const o = await reorderSupply(s.key, s.reorderQty);
      toast.show(`${o.quantity} ${s.label.toLowerCase()} ordered · ${eur(o.cents)} · arrives ${adminDate(o.arrivesAt)} · email in the Outbox`);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not reorder.", { tone: "danger" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminRow cols={COLS}>
      <span role="rowheader">{s.label}</span>
      <span role="cell" className="tabular-nums">{s.out ? "none left" : `${s.inStock} left`}</span>
      <span role="cell">
        {s.onOrder ? (
          <StatusChip state="todo" label={`${s.onOrder} on their way · ${adminDate(s.arrivesAt!)}`} />
        ) : s.low ? (
          <StatusChip state="issue" label={s.out ? "Out · reorder" : `Low · reorder at ${s.reorderAt}`} />
        ) : (
          <StatusChip state="done" label={`OK · reorder at ${s.reorderAt}`} />
        )}
      </span>
      <span role="cell">
        {canOrder && !s.onOrder && (
          <PillButton onClick={reorder} disabled={busy} aria-label={`Reorder ${s.reorderQty} ${s.label.toLowerCase()} · ${eur(s.reorderQty * s.unitCents)}`}>
            Reorder {s.reorderQty} · {eur(s.reorderQty * s.unitCents)}
          </PillButton>
        )}
      </span>
    </AdminRow>
  );
}
