"use client";

/**
 * /admin/orders (AdminOrders; phone AdminMOrders). Tabs All / To ship / Issues / Done, type pills,
 * row selection with the Ink bar (Print shipping labels · Mark as shipped · Export CSV), the 12 latest
 * orders then "Show more". `?q=` comes from the top-bar search. Orders paid at the mock checkout in
 * this browser are listed with the others (newest first).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminBox, AdminHeadRow, AdminRow, AdminTabs, Artwork, Button, OrderStatusChip, PillButton, PillLink, useToast } from "@/components";
import { ORDERS_THIS_MONTH, copyNumbersLabel, getOrders, type ItemKind, type Order, type OrdersTab } from "@/lib/api";
import { audit, hasRole, useAdminQuery } from "@/lib/client";
import { markShipped } from "@/lib/client/admin/orders";
import { simToday } from "@/lib/clock";
import { adminDate } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";
import { download, ordersCsv } from "./_parts/csv";

const TABS: Array<{ value: OrdersTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "to_ship", label: "To ship" },
  { value: "issues", label: "Issues" },
  { value: "done", label: "Done" },
];
const TYPES: Array<[ItemKind | null, string]> = [[null, "All types"], ["guide", "Guides"], ["print", "Prints"], ["gift_card", "Gift cards"]];
const COLS = "28px 90px 70px 1fr 1.6fr 70px 150px";
const PAGE = 12;

export const detailHref = (number: string) => `/admin/orders/detail?number=${number}`;

export function OrdersPage() {
  const params = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [exported, setExported] = useState(false);
  const { staff } = useAdmin();
  const orders = useAdminQuery(() => getOrders({ search: q || undefined }), [q]);

  const exportAll = (rows: Order[]) => {
    download(`geste-orders-${simToday()}.csv`, ordersCsv(rows));
    audit({ action: "order.export", target: "orders", summary: `${staff.fullName} exported ${rows.length} orders (CSV)` });
    setExported(true);
  };

  return (
    <AdminPage
      title="Orders"
      breadcrumbs={[{ label: "Sales", href: "/admin/orders" }]}
      roles={["support", "fulfilment"]}
      actions={<PillButton onClick={() => orders.data && exportAll(orders.data)}>{exported ? "CSV downloaded" : "Export CSV"}</PillButton>}
      phone={<PhoneOrders orders={orders.data} />}
      phoneTab="orders"
      desktopHref="/admin/orders"
    >
      <DesktopOrders orders={orders.data} q={q} onExport={exportAll} exported={exported} />
    </AdminPage>
  );
}

function DesktopOrders({ orders, q, onExport, exported }: { orders: Order[] | undefined; q: string; onExport: (rows: Order[]) => void; exported: boolean }) {
  const { staff } = useAdmin();
  const toast = useToast();
  const [tab, setTab] = useState<OrdersTab>("all");
  const [kind, setKind] = useState<ItemKind | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [all, setAll] = useState(false);
  const canShip = hasRole(staff.role, "fulfilment");

  const rows = useMemo(() => {
    const TAB: Record<Exclude<OrdersTab, "all">, string[]> = {
      to_ship: ["To ship", "Printed", "Packed"],
      issues: ["Refund asked", "Pending"],
      done: ["Shipped", "Delivered", "Refunded", "Partly refunded", "Cancelled"],
    };
    return (orders ?? [])
      .filter((o) => tab === "all" || TAB[tab].includes(o.displayStatus))
      .filter((o) => !kind || o.items.some((i) => i.kind === kind));
  }, [orders, tab, kind]);
  const shown = all ? rows : rows.slice(0, PAGE);
  const picked = rows.filter((o) => selected.has(o.number));

  const toggle = (n: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const shipSelected = async () => {
    const shippable = picked.filter((o) => o.items.some((i) => i.kind === "print" && i.fulfilment !== "shipped" && i.fulfilment !== "delivered"));
    try {
      for (const o of shippable) await markShipped({ number: o.number });
      toast.show(shippable.length ? `${shippable.length} ${shippable.length === 1 ? "order" : "orders"} marked as shipped` : "Nothing to ship in the selection");
      setSelected(new Set());
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not mark as shipped", { tone: "danger" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <AdminTabs label="Status" tabs={TABS} value={tab} onChange={(t) => { setTab(t); setSelected(new Set()); }} />
        <div role="group" aria-label="Type" className="flex gap-8">
          {TYPES.map(([k, label]) => (
            <PillButton key={label} pressed={kind === k} onClick={() => { setKind(k); setSelected(new Set()); }}>
              {label}
            </PillButton>
          ))}
        </div>
      </div>
      {picked.length > 0 && (
        <div role="region" aria-label="Selected orders" className="flex items-center gap-10 bg-fg px-14 py-10 text-fg-inverse">
          <span>{picked.length} selected</span>
          <PillLink href="/admin/fulfilment" inverse>Print shipping labels</PillLink>
          {canShip && <PillButton inverse onClick={shipSelected}>Mark as shipped</PillButton>}
          <PillButton inverse onClick={() => onExport(picked)}>{exported ? "CSV downloaded" : "Export CSV"}</PillButton>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto inline-flex min-h-32 cursor-pointer items-center text-fg-inverse hover:text-fg-muted-on-dark focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg-inverse">
            Clear
          </button>
        </div>
      )}
      <AdminBox role="table" aria-label="Orders" className="px-20 py-0">
        <AdminHeadRow cols={COLS}>
          <span role="columnheader"><span className="sr-only">Select</span></span>
          <span role="columnheader">Order</span>
          <span role="columnheader">Date</span>
          <span role="columnheader">Customer</span>
          <span role="columnheader">Items</span>
          <span role="columnheader">Total</span>
          <span role="columnheader">Status</span>
        </AdminHeadRow>
        {!orders && Array.from({ length: 6 }, (_, i) => <div key={i} aria-hidden="true" className="h-44 bg-surface-muted" />)}
        {orders && shown.length === 0 && <p className="py-40 text-center text-fg-muted">{q ? `No order matches “${q}”.` : "No order here."}</p>}
        {shown.map((o) => (
          <AdminRow key={o.number} cols={COLS}>
            <span role="cell" className="flex">
              <input type="checkbox" aria-label={`Select #${o.number}`} checked={selected.has(o.number)} onChange={() => toggle(o.number)} className="accent-fg" />
            </span>
            <span role="cell">
              <Link href={detailHref(o.number)} className="underline underline-offset-3 hover:text-fg-muted">#{o.number}</Link>
            </span>
            <span role="cell" className="text-fg-muted">{adminDate(o.createdAt)}</span>
            <span role="cell" className="min-w-0 truncate">
              <Link href={`/admin/customers/${o.customer.id}`} className="hover:text-fg-muted">{o.customer.fullName}</Link>
            </span>
            <span role="cell" className="min-w-0 truncate text-fg-muted">{o.summary}</span>
            <span role="cell" className="tabular-nums">{formatPrice(o.totalCents)}</span>
            <span role="cell"><OrderStatusChip status={o.displayStatus} /></span>
          </AdminRow>
        ))}
      </AdminBox>
      <p className="flex gap-8 text-fg-muted">
        <span>
          {shown.length} orders shown{q ? ` for “${q}”` : ""} · {ORDERS_THIS_MONTH} this month
        </span>
        {!all && rows.length > PAGE && (
          <button type="button" onClick={() => setAll(true)} className="cursor-pointer text-fg underline underline-offset-3 hover:text-fg-muted">
            Show {rows.length - PAGE} more
          </button>
        )}
        {q && (
          <Link href="/admin/orders" className="text-fg underline underline-offset-3 hover:text-fg-muted">
            Clear search
          </Link>
        )}
      </p>
    </>
  );
}

/** "N°07 · S · 12/100" (AdminMOrders card). */
function printLine(o: Order): string {
  const p = o.items.find((i) => i.kind === "print");
  return p ? `${p.workNumber} · ${p.edition?.size ?? ""} · ${copyNumbersLabel(p)}` : o.summary;
}

/** AdminMOrders: the orders whose print waits to ship, one-tap "Mark as shipped" (the card stays, done). */
function PhoneOrders({ orders }: { orders: Order[] | undefined }) {
  const { staff } = useAdmin();
  const toast = useToast();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const canShip = hasRole(staff.role, "fulfilment");
  const list = (orders ?? []).filter((o) => o.displayStatus === "To ship" || done.has(o.number));
  const left = list.filter((o) => !done.has(o.number)).length;

  const ship = async (o: Order) => {
    setBusy(o.number);
    try {
      await markShipped({ number: o.number });
      setDone((d) => new Set(d).add(o.number));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not mark as shipped", { tone: "danger" });
    }
    setBusy(null);
  };

  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-admin-title leading-20 font-medium tracking-heading">To ship · {orders ? left : "…"}</h1>
      {orders && list.length === 0 && <p className="text-fg-muted">Nothing to ship. Every print is on its way.</p>}
      {list.map((o) => {
        const p = o.items.find((i) => i.kind === "print");
        return (
          <div key={o.number} className="flex flex-col gap-8 border border-border bg-surface p-14">
            <div className="flex gap-10">
              {p?.imageUrl && <Artwork src={p.imageUrl} orientation={p.orientation} className="w-48" sizes="48px" />}
              <div className="flex flex-col">
                <Link href={detailHref(o.number)} className="self-start underline underline-offset-3 hover:text-fg-muted">#{o.number}</Link>
                <span>{printLine(o)}</span>
                <span className="text-fg-muted">{o.customer.fullName}{o.shippingAddress ? ` · ${o.shippingAddress.city}` : ""}</span>
              </div>
            </div>
            {canShip && (
              <Button trailing="→" fullWidth loading={busy === o.number} aria-disabled={done.has(o.number) || undefined} onClick={() => !done.has(o.number) && ship(o)}>
                {done.has(o.number) ? "Shipped · customer notified" : "Mark as shipped"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
