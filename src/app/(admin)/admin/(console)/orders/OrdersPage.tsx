"use client";

/**
 * /admin/orders (AdminOrders; phone AdminMOrders). Tabs All / To ship / Issues / Done, type pills,
 * row selection with the Ink bar (Print shipping labels · Mark as shipped · Export CSV), the 12 latest
 * orders then "Show more". `?q=` comes from the top-bar search. Orders paid at the mock checkout in
 * this browser are listed with the others (newest first).
 */
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminBox, AdminHeadRow, AdminRow, AdminTabs, Artwork, Button, Modal, OrderStatusChip, PillButton, canOpenAdmin, useToast } from "@/components";
import { copyNumbersLabel, getOrders, type ItemKind, type Order, type OrdersTab } from "@/lib/api";
import { inOrderTab, orderTab, ordersThisMonth } from "@/lib/metrics";
import { audit, hasRole, useAdminQuery } from "@/lib/client";
import { PARCELS, createLabel, markShipped, shipCopies } from "@/lib/client/admin/orders";
import { carrierOf } from "@/lib/delivery";
import { NEXT_STEP_LABEL, advancePrints, nextPrintStep } from "@/lib/client/admin/fulfilment";
import { parisDay, simToday } from "@/lib/clock";
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
const DATE = "min-h-32 border border-border-field bg-surface px-8 font-mono text-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg";
const TYPES: Array<[ItemKind | null, string]> = [[null, "All types"], ["guide", "Guides"], ["print", "Prints"], ["gift_card", "Gift cards"]];
const COLS = "28px 90px 70px 1fr 1.6fr 70px 150px";
const PAGE = 12;

export const detailHref = (number: string) => `/admin/orders/detail?number=${number}`;

export function OrdersPage() {
  const params = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [exported, setExported] = useState(false);
  const router = useRouter();
  // Filters live in the URL: `?tab=to_ship` (the sidebar badge, the phone's "To do"), `?type=print`,
  // `?from=2026-09-06&to=2026-10-05` (a dashboard tile or a day of the revenue chart), `?q=`.
  const tab: OrdersTab = TABS.some((t) => t.value === params.get("tab")) ? (params.get("tab") as OrdersTab) : "all";
  const kind = (["guide", "print", "gift_card"] as const).find((k) => k === params.get("type")) ?? null;
  const from = params.get("from") ?? "", to = params.get("to") ?? "";
  const setFilter = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v && !(k === "tab" && v === "all")) next.set(k, v);
      else next.delete(k);
    }
    router.replace(`/admin/orders/${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const setTab = (t: OrdersTab) => setFilter({ tab: t });
  const setKind = (k: ItemKind | null) => setFilter({ type: k });
  const { staff } = useAdmin();
  const orders = useAdminQuery(() => getOrders({ search: q || undefined }), [q]);
  // What is filtered (search, tab, type, dates) is what "Export CSV" exports. Dates are Paris days of payment.
  const rows = useMemo(
    () =>
      (orders.data ?? [])
        .filter((o) => inOrderTab(o, tab))
        .filter((o) => !kind || o.items.some((i) => i.kind === kind))
        .filter((o) => (!from || parisDay(o.paidAt) >= from) && (!to || parisDay(o.paidAt) <= to)),
    [orders.data, tab, kind, from, to],
  );

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
      actions={<PillButton onClick={() => orders.data && exportAll(rows)}>{exported ? "CSV downloaded" : "Export CSV"}</PillButton>}
      phone={<PhoneOrders orders={orders.data} />}
      phoneTab="orders"
      desktopHref="/admin/orders"
    >
      <DesktopOrders orders={orders.data} rows={rows} q={q} tab={tab} setTab={setTab} kind={kind} setKind={setKind} from={from} to={to} setDates={(f, t) => setFilter({ from: f || null, to: t || null })} onExport={exportAll} exported={exported} />
    </AdminPage>
  );
}

interface DesktopOrdersProps {
  orders: Order[] | undefined;
  rows: Order[];
  q: string;
  tab: OrdersTab;
  setTab: (t: OrdersTab) => void;
  kind: ItemKind | null;
  setKind: (k: ItemKind | null) => void;
  from: string;
  to: string;
  setDates: (from: string, to: string) => void;
  onExport: (rows: Order[]) => void;
  exported: boolean;
}

function DesktopOrders({ orders, rows, q, tab, setTab, kind, setKind, from, to, setDates, onExport, exported }: DesktopOrdersProps) {
  const { staff } = useAdmin();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [all, setAll] = useState(false);
  const [labelsFor, setLabelsFor] = useState<Order[] | null>(null);
  const canShip = hasRole(staff.role, "fulfilment");
  const shown = all ? rows : rows.slice(0, PAGE);
  const picked = rows.filter((o) => selected.has(o.number));

  const toggle = (n: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  // The same action as the board and the detail (`shipCopies`): only packed orders leave; the others are named.
  const shipSelected = async () => {
    const ready = picked.filter((o) => nextPrintStep(o) === "shipped");
    const waiting = picked.filter((o) => { const s = nextPrintStep(o); return s === "printed" || s === "packed"; }).length;
    try {
      const shipped = ready.length ? await shipCopies(ready.flatMap((o) => o.items.filter((i) => i.kind === "print" && i.fulfilment !== "returned").flatMap((i) => i.copyIds))) : [];
      const plural = (n: number) => `${n} ${n === 1 ? "order" : "orders"}`;
      toast.show(
        [shipped.length ? `${plural(shipped.length)} marked as shipped` : "", waiting ? `${plural(waiting)} not packed yet` : ""].filter(Boolean).join(" · ") || "Nothing to ship in the selection",
      );
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
      <div role="group" aria-label="Dates of payment" className="flex flex-wrap items-center gap-8">
        <label htmlFor="ord-from" className="text-fg-muted">Paid from</label>
        <input id="ord-from" type="date" value={from} max={to || undefined} onChange={(e) => setDates(e.target.value, to)} className={DATE} />
        <label htmlFor="ord-to" className="text-fg-muted">to</label>
        <input id="ord-to" type="date" value={to} min={from || undefined} onChange={(e) => setDates(from, e.target.value)} className={DATE} />
        {(from || to) && <PillButton onClick={() => setDates("", "")}>All dates</PillButton>}
      </div>
      {picked.length > 0 && (
        <div role="region" aria-label="Selected orders" className="flex items-center gap-10 bg-fg px-14 py-10 text-fg-inverse">
          <span>{picked.length} selected</span>
          {canShip && <PillButton inverse onClick={() => setLabelsFor(picked)}>Create labels</PillButton>}
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
              {canOpenAdmin(staff.role, "/admin/customers") ? <Link href={`/admin/customers/detail/?id=${o.customer.id}`} className="hover:text-fg-muted">{o.customer.fullName}</Link> : o.customer.fullName}
            </span>
            <span role="cell" className="min-w-0 truncate text-fg-muted">{o.summary}</span>
            <span role="cell" className="tabular-nums">{formatPrice(o.totalCents)}</span>
            <span role="cell"><OrderStatusChip status={o.displayStatus} /></span>
          </AdminRow>
        ))}
      </AdminBox>
      <p className="flex gap-8 text-fg-muted">
        <span>
          {shown.length} orders shown{q ? ` for “${q}”` : ""} · {ordersThisMonth()} this month
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
      {labelsFor && (
        <BulkLabels
          orders={labelsFor}
          onClose={() => setLabelsFor(null)}
          onDone={(made) => {
            setLabelsFor(null);
            setSelected(new Set());
            toast.show(made ? `${made} ${made === 1 ? "label" : "labels"} created` : "No label created");
          }}
        />
      )}
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
  // The badge's rule (`orderTab`): every order still in "To ship" (to print, printed, packed).
  const list = (orders ?? []).filter((o) => orderTab(o) === "to_ship" || done.has(o.number));
  const left = list.filter((o) => !done.has(o.number)).length;

  // One button per order, the next step of its prints: printed & signed → packed → shipped.
  const ship = async (o: Order) => {
    setBusy(o.number);
    try {
      if (nextPrintStep(o) === "shipped") {
        await markShipped({ number: o.number });
        setDone((d) => new Set(d).add(o.number));
      } else await advancePrints(o.number);
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
                {done.has(o.number) ? "Shipped · customer notified" : NEXT_STEP_LABEL[nextPrintStep(o) ?? "shipped"]}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Bulk "Create labels" (docs/admin-v2/04 Orders): one Boxtal label per selected order whose prints are
 * all packed and that has none yet; the others are listed with the reason before anything is bought.
 */
function BulkLabels({ orders, onClose, onDone }: { orders: Order[]; onClose: () => void; onDone: (made: number) => void }) {
  const [busy, setBusy] = useState(false);
  const why = (o: Order) => {
    if (!o.items.some((i) => i.kind === "print")) return "no print";
    if (o.shipment) return "label already created";
    const step = nextPrintStep(o);
    return step === "shipped" ? null : step === null ? "already shipped" : "not packed yet";
  };
  const eligible = orders.filter((o) => !why(o));
  const skipped = orders.filter((o) => why(o));
  const run = async () => {
    setBusy(true);
    let made = 0;
    for (const o of eligible) {
      const big = o.items.some((i) => i.kind === "print" && i.edition && i.edition.size !== "S");
      await createLabel({ number: o.number, carrier: carrierOf(o.shippingMethod), parcel: big ? PARCELS[1] : PARCELS[0] }).then(() => made++, () => undefined);
    }
    onDone(made);
  };
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Create ${eligible.length} shipping ${eligible.length === 1 ? "label" : "labels"}?`}
      width={460}
      placement="admin"
      actions={
        <>
          <Button variant="ghost" className="grow" onClick={onClose}>Cancel</Button>
          <Button className="grow-2" trailing="→" loading={busy} disabled={!eligible.length} onClick={run}>Create {eligible.length}</Button>
        </>
      }
    >
      {eligible.length > 0 && <p>{eligible.map((o) => `#${o.number}`).join(", ")} · bought through Boxtal, cost in the books.</p>}
      {skipped.length > 0 && (
        <ul aria-label="Not eligible" className="flex flex-col gap-4 text-fg-muted">
          {skipped.map((o) => <li key={o.number}>#{o.number} · {why(o)}</li>)}
        </ul>
      )}
    </Modal>
  );
}
