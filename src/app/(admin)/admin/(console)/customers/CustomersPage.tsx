"use client";

/**
 * /admin/customers (AdminCustomers): segments All / Repeat buyers / Newsletter / Abroad, one row per
 * customer (whole row → the customer), "Export CSV" of the segment shown. Owner and Support.
 */
import Link from "next/link";
import { useState } from "react";
import { AdminHeadRow, AdminRow, AdminTabs, PillButton, useToast } from "@/components";
import { getCustomers, type CustomerSegment, type CustomerSummary } from "@/lib/api";
import { audit, requireStaff, useAdminQuery } from "@/lib/client";
import { downloadFile, toCsv } from "@/lib/client/admin/download";
import { adminDate } from "@/lib/dates";
import { AdminPage } from "../../_admin/AdminPage";

const COLS = "1.2fr 1.6fr 80px 90px 90px 90px 60px";
const SEGMENTS: Array<{ value: CustomerSegment; label: string }> = [
  { value: "all", label: "All" },
  { value: "repeat", label: "Repeat buyers" },
  { value: "newsletter", label: "Newsletter" },
  { value: "abroad", label: "Abroad" },
];

const dollars = (cents: number) => `$${Math.round(cents / 100)}`;

export function CustomersPage() {
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const list = useAdminQuery(() => getCustomers({ segment }), [segment]);
  const toast = useToast();

  const exportCsv = () => {
    if (list.status !== "ready") return;
    try {
      const staff = requireStaff("support");
      const rows = list.data.map((c) => [c.fullName, c.email, c.ordersCount, (c.spentCents / 100).toFixed(2), c.lastOrderAt?.slice(0, 10) ?? "", c.newsletter ? "yes" : "no", c.country]);
      downloadFile(`geste-customers-${segment}.csv`, toCsv([["Name", "Email", "Orders", "Spent (USD)", "Last order", "Newsletter", "Country"], ...rows]));
      audit({ action: "customers.export", target: `customers:${segment}`, summary: `${staff.fullName} exported ${rows.length} customers (CSV)` });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not export.", { tone: "danger" });
    }
  };

  return (
    <AdminPage
      title="Customers"
      breadcrumbs={[{ label: "Customers", href: "/admin/customers" }]}
      roles={["support"]}
      desktopHref="/admin/customers"
      actions={<PillButton onClick={exportCsv} disabled={list.status !== "ready"}>Export CSV</PillButton>}
    >
      <div className="flex flex-wrap items-start justify-between gap-16">
        <AdminTabs label="Segment" tabs={SEGMENTS} value={segment} onChange={setSegment} />
        <span className="text-fg-muted" role="status">{list.status === "ready" ? `${list.data.length} customers` : ""}</span>
      </div>
      <div className="relative overflow-x-auto">
        <div role="table" aria-label="Customers" aria-busy={list.status === "loading"} className="flex min-w-880 flex-col gap-14 border border-border bg-surface px-20">
          <AdminHeadRow cols={COLS}>
            {["Name", "Email", "Orders", "Spent", "Last order", "Newsletter", "Country"].map((h) => <span key={h} role="columnheader">{h}</span>)}
          </AdminHeadRow>
          {list.status === "loading"
            ? Array.from({ length: 8 }, (_, i) => <div key={i} role="row" aria-hidden="true" className="box-content min-h-44 border-b border-border" />)
            : list.data.length === 0
              ? <div role="row"><p role="cell" className="py-40 text-center text-fg-muted">No customer in this segment yet.</p></div>
              : list.data.map((c) => <CustomerRow key={c.id} c={c} />)}
        </div>
      </div>
    </AdminPage>
  );
}

/** A table row whose name is a link stretched over the whole row (the board's row link, with table semantics kept). */
function CustomerRow({ c }: { c: CustomerSummary }) {
  return (
    <AdminRow cols={COLS} className="relative hover:bg-surface-hover has-[a:focus-visible]:outline has-[a:focus-visible]:outline-1 has-[a:focus-visible]:outline-fg">
      <span role="cell">
        <Link href={`/admin/customers/${c.id}`} className="outline-none after:absolute after:inset-0">{c.fullName}</Link>
        {c.deletionScheduledAt && <span className="text-fg-muted"> · deletion scheduled</span>}
      </span>
      <span role="cell" className="truncate text-fg-muted">{c.email}</span>
      <span role="cell">{c.ordersCount}</span>
      <span role="cell">{dollars(c.spentCents)}</span>
      <span role="cell">{c.lastOrderAt ? adminDate(c.lastOrderAt) : "—"}</span>
      <span role="cell">{c.newsletter ? "Yes" : "No"}</span>
      <span role="cell">{c.country}</span>
    </AdminRow>
  );
}
