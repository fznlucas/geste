"use client";

/**
 * /admin/editions (AdminEditions): every edition with sold / edition bar, reserved, left (Signal at 5 or
 * fewer), price, Close edition / Reopen, Edit (→ the work editor), and the certificate log (printed copies,
 * local checkout copies included). Owner and Fulfilment (docs/admin.md).
 */
import { useState } from "react";
import { AdminBox, AdminHeadRow, AdminRow, AdminTitle, Artwork, PillButton, PillLink, UnderLink, useToast } from "@/components";
import { getCertificateLog, getEditions, type PrintCopy, type PrintEdition } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { setEditionOpen } from "@/lib/client/admin/fulfilment";
import { cn } from "@/lib/cn";
import { adminDate } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { AdminPage } from "../../_admin/AdminPage";

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
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = async (e: PrintEdition) => {
    setBusy(e.id);
    try {
      await setEditionOpen(e.id, !e.open);
      toast.show(e.open ? `${e.workNumber} ${e.size} closed` : `${e.workNumber} ${e.size} reopened`);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not change the edition.", { tone: "danger" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminPage title="Print editions" breadcrumbs={[{ label: "Sales", href: "/admin/orders" }]} roles={["fulfilment"]} desktopHref="/admin/editions">
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
            : data.data.editions.map((e) => <EditionRow key={e.id} e={e} busy={busy === e.id} onToggle={() => toggle(e)} />)}
        </div>
      </div>
      <span className="text-fg-muted">Editions are numbered in order of payment. A refund with “back in stock” frees the number for the next buyer. Closing an edition hides the size from the store.</span>
      <AdminBox className="max-w-602">
        <AdminTitle>Certificate log</AdminTitle>
        {data.status === "ready" && data.data.log.length === 0 && <p className="text-fg-muted">No certificate signed yet.</p>}
        {data.status === "ready" && (
          <ul aria-label="Certificates" className="flex flex-col gap-14">
            {data.data.log.map((c) => <LogRow key={c.id} c={c} />)}
          </ul>
        )}
      </AdminBox>
    </AdminPage>
  );
}

function EditionRow({ e, busy, onToggle }: { e: PrintEdition; busy: boolean; onToggle: () => void }) {
  const low = e.open && e.left <= 5;
  return (
    <AdminRow cols={COLS} className="min-h-60">
      <span role="cell">
        <Artwork src={e.imageUrl} orientation={e.orientation} className="w-36" sizes="36px" />
      </span>
      <span role="cell"><UnderLink href={`/admin/works/${e.workSlug}`}>{e.workNumber}</UnderLink></span>
      <span role="cell">{e.size} <span className="text-fg-muted">· {e.dimensions.replace(" cm", "")}</span></span>
      <span role="cell" className="flex items-center gap-10">
        <span aria-hidden="true" className="relative h-8 grow bg-surface-muted">
          <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${Math.round((e.sold / e.editionSize) * 100)}%` }} />
        </span>
        <span>{e.sold}/{e.editionSize}</span>
      </span>
      <span role="cell">{e.reserved}</span>
      <span role="cell" className={cn(low && "text-danger")}>
        {e.open ? e.left : "closed"}
        {low && <span className="sr-only"> (low stock)</span>}
      </span>
      <span role="cell">{formatPrice(e.priceCents)}</span>
      <span role="cell" className="flex gap-6">
        <PillButton onClick={onToggle} disabled={busy} aria-label={`${e.open ? "Close edition" : "Reopen"} ${e.workNumber} ${e.size}`}>
          {e.open ? "Close edition" : "Reopen"}
        </PillButton>
        <PillLink href={`/admin/works/${e.workSlug}`}>
          Edit<span className="sr-only"> {e.workNumber} {e.size}</span>
        </PillLink>
      </span>
    </AdminRow>
  );
}

function LogRow({ c }: { c: PrintCopy }) {
  return (
    <li className="box-content grid min-h-44 items-center gap-x-12 border-b border-border" style={{ gridTemplateColumns: LOG_COLS }}>
      <span className="text-fg-muted">#{c.certificateNo}</span>
      <span>{c.workNumber} {c.size} {c.label}{c.customerName ? ` · ${c.customerName}` : ""}</span>
      <span className="text-fg-muted">{adminDate(c.printedAt!)}</span>
    </li>
  );
}
