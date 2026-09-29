"use client";

/**
 * /admin/customers/[id] (AdminCustomerDetail): profile and tags, account (login link, print quota, write),
 * GDPR (export, delete in two clicks), library with the reader's progress, orders, results shared.
 * Owner and Support. Nothing is emailed or deleted in the mock; every action is audited.
 */
import { useState, type ReactNode } from "react";
import { AdminBox, AdminRow, AdminTitle, Artwork, Button, ButtonLink, StatusChip, UnderLink, useToast } from "@/components";
import { getCustomer, libraryProgress, type CustomerDetail, type LibraryItem, type Order } from "@/lib/api";
import { useAdminQuery, useLibraryProgress } from "@/lib/client";
import { exportCustomerData, resetPrintCredits, scheduleDeletion, sendLoginLink } from "@/lib/client/admin/customers";
import { downloadFile } from "@/lib/client/admin/download";
import { adminDate, shortDate } from "@/lib/dates";
import type { StatusState } from "@/lib/types";
import { AdminPage } from "../../../_admin/AdminPage";

const dollars = (cents: number) => `$${Math.round(cents / 100)}`;
const firstName = (c: CustomerDetail) => c.fullName.split(" ")[0]!;

export function CustomerDetailPage({ id }: { id: string }) {
  const customer = useAdminQuery(() => getCustomer(id), [id]);
  const c = customer.data;
  return (
    <AdminPage title={c?.fullName ?? "Customer"} breadcrumbs={[{ label: "Customers", href: "/admin/customers" }]} roles={["support"]} desktopHref={`/admin/customers/${id}`}>
      {customer.status === "loading" ? (
        <div aria-busy="true" aria-label="Loading" className="min-h-480" />
      ) : !c ? (
        <p className="text-fg-muted">This customer does not exist.</p>
      ) : (
        <Detail c={c} />
      )}
    </AdminPage>
  );
}

function Detail({ c }: { c: CustomerDetail }) {
  const library = useLibraryProgress(c.library);
  const finished = library.filter((l) => l.state === "finished").length;
  const tags = [c.ordersCount > 1 && "repeat buyer", c.source, finished > 0 && `finished ${finished} guide${finished > 1 ? "s" : ""}`].filter(Boolean) as string[];
  const results = c.reviews.filter((r) => r.photoUrl);

  return (
    <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-12">
      <div className="flex flex-col gap-16 lg:col-span-4">
        <AdminBox>
          <span className="text-admin-title leading-20 font-medium tracking-heading">{c.fullName}</span>
          <span>
            {c.email}
            <br />
            {[c.phone, `${c.city}, ${c.country}`].filter(Boolean).join(" · ")}
          </span>
          <span className="text-fg-muted">
            Customer since {shortDate(c.createdAt)} · {c.ordersCount} order{c.ordersCount === 1 ? "" : "s"} · {dollars(c.spentCents)} · newsletter {c.newsletter ? "yes" : "no"}
          </span>
          {tags.length > 0 && (
            <ul aria-label="Tags" className="flex flex-wrap gap-6">
              {tags.map((t) => <li key={t} className="inline-flex min-h-34 items-center border border-border-field px-10">{t}</li>)}
            </ul>
          )}
        </AdminBox>
        <Account c={c} />
        <Privacy c={c} />
      </div>
      <div className="flex min-w-0 flex-col gap-16 lg:col-span-8">
        <AdminBox>
          <AdminTitle>Library</AdminTitle>
          {library.length === 0 && <p className="text-fg-muted">No guide yet.</p>}
          {library.length > 0 && (
            <div role="table" aria-label="Library" className="flex flex-col gap-14">
              {library.map((l) => <LibraryLine key={l.entitlementId} l={l} />)}
            </div>
          )}
        </AdminBox>
        <AdminBox>
          <AdminTitle>Orders</AdminTitle>
          {c.orders.length === 0 && <p className="text-fg-muted">No order yet.</p>}
          {c.orders.map((o) => <OrderLine key={o.id} o={o} />)}
        </AdminBox>
        <AdminBox>
          <AdminTitle>Results shared</AdminTitle>
          {results.length === 0 && <p className="text-fg-muted">No result shared yet.</p>}
          {results.map((r) => {
            const done = library.find((l) => l.work.id === r.work.id && l.completedAt)?.completedAt;
            return (
              <div key={r.id} className="flex gap-12">
                {/* eslint-disable-next-line @next/next/no-img-element -- customer photo, 90 × 112 as drawn */}
                <img src={r.photoUrl!} alt={`${r.work.number} painted by ${c.fullName}`} className="block h-112 w-90 shrink-0 object-cover" />
                <div className="flex flex-col gap-6">
                  <span>{r.work.number}, signed {shortDate(done ?? r.createdAt)}</span>
                  <span className="text-fg-muted">“{r.body}”</span>
                  <UnderLink href="/admin/reviews" className="self-start">Open in moderation</UnderLink>
                </div>
              </div>
            );
          })}
        </AdminBox>
      </div>
    </div>
  );
}

/** Account box: sign-in methods, login link, print quota, write. */
function Account({ c }: { c: CustomerDetail }) {
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [reset, setReset] = useState(false);
  const run = (action: () => Promise<void>, done: () => void) => async () => {
    try {
      await action();
      done();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Something went wrong.", { tone: "danger" });
    }
  };
  return (
    <AdminBox>
      <AdminTitle>Account</AdminTitle>
      <StatusChip state="done" label={`Password set${c.passkeyDevices.length ? ` · Face ID on ${c.passkeyDevices[0]}` : ""}`} />
      <StatusChip state="done" label="Email verified" />
      <Button variant="ghost" aria-live="polite" onClick={run(() => sendLoginLink(c.id), () => setSent(true))}>{sent ? "Login link sent" : "Send a login link"}</Button>
      <Button variant="ghost" aria-live="polite" onClick={run(() => resetPrintCredits(c.id), () => setReset(true))}>{reset ? "Print quota reset to 3" : "Reset print quota"}</Button>
      <ButtonLink href="/admin/support" variant="ghost">Write to {firstName(c)}</ButtonLink>
    </AdminBox>
  );
}

/** Privacy (GDPR): export (downloaded here, emailed to the customer in production) and deletion in two clicks. */
function Privacy({ c }: { c: CustomerDetail }) {
  const toast = useToast();
  const [exported, setExported] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const scheduled = !!c.deletionScheduledAt;
  const onExport = async () => {
    try {
      const data = await exportCustomerData(c.id);
      downloadFile(`geste-${c.id}.json`, JSON.stringify(data, null, 2), "application/json");
      setExported(true);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not export.", { tone: "danger" });
    }
  };
  const onDelete = async () => {
    if (scheduled) return;
    if (!confirming) return setConfirming(true);
    try {
      await scheduleDeletion(c.id);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not schedule the deletion.", { tone: "danger" });
    }
  };
  return (
    <AdminBox>
      <AdminTitle>Privacy (GDPR)</AdminTitle>
      <Button variant="ghost" aria-live="polite" onClick={onExport}>{exported ? `Export emailed to ${firstName(c)}` : `Export ${firstName(c)}’s data`}</Button>
      <Button variant="danger" aria-live="polite" aria-disabled={scheduled || undefined} onClick={onDelete} onBlur={() => setConfirming(false)}>
        {scheduled ? "Deletion scheduled (30 days)" : confirming ? "Click again to confirm" : "Delete account…"}
      </Button>
    </AdminBox>
  );
}

function LibraryLine({ l }: { l: LibraryItem }) {
  const pct = Math.round(libraryProgress(l) * 100);
  const status = l.revoked
    ? "Access revoked"
    : l.state === "finished"
      ? `Finished · ${adminDate(l.completedAt!)}`
      : l.state === "in_progress"
        ? `Layer ${l.currentLayer} of ${l.layerCount} · ${adminDate(l.openedAt!)}`
        : "Not started";
  return (
    <AdminRow cols="50px 80px 1fr 160px 120px">
      <span role="cell">
        <Artwork src={l.work.imageUrl} orientation={l.work.orientation} className="w-36" sizes="36px" />
      </span>
      <span role="cell">{l.work.number}</span>
      <span role="cell">
        <span role="progressbar" aria-label={`${l.work.number} progress`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="relative block h-8 bg-surface-muted">
          <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span role="cell" className="text-fg-muted">{status}</span>
      <span role="cell" className="text-fg-muted">{l.printsLeft} print{l.printsLeft === 1 ? "" : "s"} left</span>
    </AdminRow>
  );
}

/** "Guide N°03 · Print N°07", "Guides N°01, N°07", "Gift card $30" (AdminCustomerDetail). */
function itemsLine(o: Order): string {
  const guides = o.items.filter((i) => i.kind === "guide").map((i) => i.workNumber!).sort();
  const parts: string[] = [];
  if (guides.length) parts.push(guides.length > 1 ? `Guides ${guides.join(", ")}` : `Guide ${guides[0]}`);
  for (const i of o.items) if (i.kind === "print") parts.push(`Print ${i.workNumber}`);
  for (const i of o.items) if (i.kind === "gift_card") parts.push(i.title);
  return parts.join(" · ");
}

function orderChip(o: Order): { state: StatusState; label: string } {
  if (o.items.every((i) => i.kind === "gift_card") && o.displayStatus === "Delivered") return { state: "done", label: "Sent" };
  const s = o.displayStatus;
  if (s === "To ship" || s === "Refund asked" || s === "Pending") return { state: "issue", label: s };
  if (s === "Printed" || s === "Packed") return { state: "todo", label: s };
  if (s === "Refunded" || s === "Cancelled") return { state: "off", label: s };
  return { state: "done", label: s };
}

function OrderLine({ o }: { o: Order }): ReactNode {
  const chip = orderChip(o);
  return (
    <AdminRow cols="100px 90px 1fr 70px 130px" href={`/admin/orders/detail?number=${o.number}`}>
      <span className="underline underline-offset-3">#{o.number}</span>
      <span className="text-fg-muted">{adminDate(o.paidAt)}</span>
      <span>{itemsLine(o)}</span>
      <span>{dollars(o.totalCents)}</span>
      <StatusChip state={chip.state} label={chip.label} />
    </AdminRow>
  );
}
