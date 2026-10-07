"use client";

/**
 * /admin/editions (AdminEditions): every edition with sold / edition bar, reserved, left (Signal at 5 or
 * fewer), price, Close edition / Reopen, Edit (→ the work editor), and the certificate log (printed copies,
 * local checkout copies included). Owner and Fulfilment (docs/admin.md).
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminBox, AdminHeadRow, AdminRow, AdminTitle, Artwork, PillButton, PillLink, UnderLink, canOpenAdmin, useToast } from "@/components";
import { getCertificateLog, getEditions, type PrintCopy, type PrintEdition } from "@/lib/api";
import { hasRole, useAdminQuery } from "@/lib/client";
import { isLowStock } from "@/lib/metrics";
import { setEditionOpen, setEditionSize } from "@/lib/client/admin/fulfilment";
import { cn } from "@/lib/cn";
import { adminDate } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

const COLS = "56px 80px 120px 1fr 90px 90px 90px 200px";
const LOG_COLS = "120px 1fr 90px";

/** Grouped by work, in the order the works first appear (N°07's S, M, L, then N°01's…), as on the board. */
function byWork(list: PrintEdition[]): PrintEdition[] {
  const order = [...new Set(list.map((e) => e.workId))];
  return [...list].sort((a, b) => order.indexOf(a.workId) - order.indexOf(b.workId));
}

export function EditionsPage() {
  const data = useAdminQuery(async () => ({ editions: byWork(await getEditions({ includeClosed: true })), log: await getCertificateLog() }), []);
  const toast = useToast();
  const { staff } = useAdmin();
  const canClose = hasRole(staff.role, "fulfilment");
  const [cert, setCert] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // ?low=1 (the sidebar's count): only the editions with 1 to 5 copies left.
  const lowOnly = useSearchParams().get("low") === "1";

  const toggle = async (e: PrintEdition) => {
    setBusy(e.id);
    try {
      await setEditionOpen(e.id, e.closedByHand);
      toast.show(e.closedByHand ? `${e.workNumber} ${e.size} reopened` : `${e.workNumber} ${e.size} closed`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not change the edition.", { tone: "danger" });
    } finally {
      setBusy(null);
    }
  };

  const raise = async (e: PrintEdition, size: number) => {
    setBusy(e.id);
    try {
      await setEditionSize(e.id, size);
      toast.show(`${e.workNumber} ${e.size}: ${size} copies${e.soldOut ? " · reopened" : ""}`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not change the edition.", { tone: "danger" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminPage title="Print editions" breadcrumbs={[{ label: "Sales", href: "/admin/orders" }]} roles={["fulfilment", "content"]} desktopHref="/admin/editions">
      {lowOnly && (
        <p role="status" className="flex gap-8">
          <span>Low stock only: 1 to 5 copies left.</span>
          <UnderLink href="/admin/editions">Show every edition</UnderLink>
        </p>
      )}
      <div className="relative overflow-x-auto">
        <div role="table" aria-label="Print editions" aria-busy={data.status === "loading"} className="relative flex min-w-920 flex-col gap-14 border border-border bg-surface px-20">
          <AdminHeadRow cols={COLS}>
            <span role="columnheader"><span className="sr-only">Image</span></span>
            <span role="columnheader">Work</span>
            <span role="columnheader">Size</span>
            <span role="columnheader">Sold / edition</span>
            <span role="columnheader">Reserved</span>
            <span role="columnheader">Left</span>
            <span role="columnheader">Price</span>
            <span role="columnheader">Actions</span>
          </AdminHeadRow>
          {data.status === "loading"
            ? Array.from({ length: 7 }, (_, i) => <div key={i} aria-hidden="true" className="box-content min-h-60 border-b border-border" />)
            : data.data.editions.filter((e) => !lowOnly || isLowStock(e)).map((e) => (
                <EditionRow key={e.id} e={e} busy={busy === e.id} onToggle={canClose ? () => toggle(e) : undefined} onRaise={canClose ? (size) => raise(e, size) : undefined} canEditWork={canOpenAdmin(staff.role, "/admin/works")} />
              ))}
        </div>
      </div>
      <span className="text-fg-muted">Editions are numbered in order of payment. A refund with “back in stock” frees the number for the next buyer. Closing an edition hides the size from the store; a sold-out edition closes itself and reopens with a bigger size.</span>
      <AdminBox className="max-w-602">
        <div className="flex items-center justify-between gap-12">
          <AdminTitle>Certificate log</AdminTitle>
          <label className="flex items-center gap-8">
            <span className="sr-only">Find a certificate</span>
            <input value={cert} onChange={(e) => setCert(e.target.value)} placeholder="C-07-S-012" className="min-h-32 w-140 border border-border-field bg-surface px-8 font-mono text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg" />
          </label>
        </div>
        {data.status === "ready" && data.data.log.length === 0 && <p className="text-fg-muted">No certificate signed yet.</p>}
        {data.status === "ready" && (
          <ul aria-label="Certificates" className="flex flex-col gap-14">
            {data.data.log.filter((c) => !cert.trim() || c.certificateNo?.toLowerCase().includes(cert.trim().toLowerCase())).map((c) => <LogRow key={c.id} c={c} linkOrder={canOpenAdmin(staff.role, "/admin/orders")} />)}
          </ul>
        )}
      </AdminBox>
    </AdminPage>
  );
}

/** `onToggle` absent: the role reads the stock (Content), closing and reopening stay with Fulfilment. */
function EditionRow({ e, busy, onToggle, onRaise, canEditWork }: { e: PrintEdition; busy: boolean; onToggle?: () => void; onRaise?: (size: number) => void; canEditWork: boolean }) {
  const [size, setSize] = useState(String(e.editionSize + 10));
  const low = isLowStock(e);
  return (
    <AdminRow cols={COLS} className="min-h-60">
      <span role="cell">
        <Artwork src={e.imageUrl} orientation={e.orientation} className="w-36" sizes="36px" />
      </span>
      <span role="cell">{canEditWork ? <UnderLink href={`/admin/works/${e.workSlug}`}>{e.workNumber}</UnderLink> : e.workNumber}</span>
      <span role="cell">{e.size} <span className="text-fg-muted">· {e.dimensions.replace(" cm", "")}</span></span>
      <span role="cell" className="flex items-center gap-10">
        <span aria-hidden="true" className="relative h-8 grow bg-surface-muted">
          <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${Math.round((e.sold / e.editionSize) * 100)}%` }} />
        </span>
        <span>{e.sold}/{e.editionSize}</span>
      </span>
      <span role="cell">{e.reserved}</span>
      <span role="cell" className={cn(low && "text-danger")}>
        {e.open ? e.left : e.soldOut ? "sold out" : "closed"}
        {low && <span className="sr-only"> (low stock)</span>}
      </span>
      <span role="cell">{formatPrice(e.priceCents)}</span>
      <span role="cell" className="flex gap-6">
        {onRaise && e.soldOut ? (
          <>
            <input
              aria-label={`New size of the ${e.workNumber} ${e.size} edition`}
              inputMode="numeric"
              value={size}
              onChange={(ev) => setSize(ev.target.value)}
              className="min-h-32 w-56 border border-border-field bg-surface px-6 font-mono text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
            />
            <PillButton onClick={() => onRaise(Number(size))} disabled={busy} aria-label={`Raise size and reopen ${e.workNumber} ${e.size}`}>Raise size</PillButton>
          </>
        ) : onToggle && (
          <PillButton onClick={onToggle} disabled={busy} aria-label={`${e.closedByHand ? "Reopen" : "Close edition"} ${e.workNumber} ${e.size}`}>
            {e.closedByHand ? "Reopen" : "Close edition"}
          </PillButton>
        )}
        {canEditWork && (
          <PillLink href={`/admin/works/${e.workSlug}`}>
            Edit<span className="sr-only"> {e.workNumber} {e.size}</span>
          </PillLink>
        )}
      </span>
    </AdminRow>
  );
}

function LogRow({ c, linkOrder }: { c: PrintCopy; linkOrder: boolean }) {
  return (
    <li className="box-content grid min-h-44 items-center gap-x-12 border-b border-border" style={{ gridTemplateColumns: LOG_COLS }}>
      <span className="text-fg-muted">#{c.certificateNo}</span>
      <span>
        {c.orderNumber && linkOrder ? <UnderLink href={`/admin/orders/detail?number=${c.orderNumber}`}>{c.workNumber} {c.size} {c.label}</UnderLink> : `${c.workNumber} ${c.size} ${c.label}`}
        {c.customerName ? ` · ${c.customerName}` : ""}
      </span>
      <span className="text-fg-muted">{adminDate(c.printedAt!)}</span>
    </li>
  );
}
