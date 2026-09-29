"use client";

/**
 * /admin (AdminDashboard ≥ 768 px, AdminMToday below). KPI tiles link to their module; the revenue
 * chart (7 / 30 / 90 d) and the money tiles are the owner's only (docs/admin.md "✓ no revenue"); the
 * to-do list shows the modules the role can open, with the sidebar's live counts; latest orders come
 * from getOrders, so an order paid at checkout in this browser tops the list and moves the numbers.
 */
import { useState } from "react";
import { AdminBox, AdminHeadRow, AdminRow, AdminTitle, Artwork, BarChart, ButtonLink, KpiTile, PillButton, StatusChip, UnderLink } from "@/components";
import { getDashboard, getLowEdition, getOrders, type Dashboard, type Order } from "@/lib/api";
import { hasRole, useAdminQuery } from "@/lib/client";
import { formatPrice } from "@/lib/format";
import type { StaffRole, StatusState } from "@/lib/types";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

type Range = 7 | 30 | 90;

const orderHref = (o: Order) => `/admin/orders/detail/?number=${o.number}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function greeting(name: string) {
  const h = new Date().getHours();
  return `Good ${h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"}, ${name}`;
}

/** Status words of the dashboard's latest orders (AdminDashboard): "Print to ship", "Sent" for gift cards. */
function dashboardStatus(o: Order): { state: StatusState; label: string } {
  switch (o.displayStatus) {
    case "To ship":
      return { state: "issue", label: "Print to ship" };
    case "Refund asked":
      return { state: "issue", label: "Refund asked" };
    case "Printed":
    case "Packed":
    case "Pending":
      return { state: "todo", label: o.displayStatus };
    case "Delivered":
      return { state: "done", label: o.items.every((i) => i.kind === "gift_card") ? "Sent" : "Delivered" };
    default:
      return { state: "done", label: o.displayStatus };
  }
}

interface Todo {
  key: string;
  text: string;
  issue: boolean;
  href: string;
  phoneHref?: string;
  roles: StaffRole[];
}

/** "To do today": one line per module with something waiting, for the roles that can act on it. */
function useTodos(): Todo[] | null {
  const { counts } = useAdmin();
  const low = useAdminQuery(getLowEdition, []);
  if (!counts || low.status === "loading") return null;
  const list: Array<Todo | null> = [
    counts.fulfilment ? { key: "ship", text: `${plural(counts.fulfilment, "print", "prints")} to pack and ship`, issue: true, href: "/admin/fulfilment", roles: ["owner", "fulfilment"] } : null,
    counts.support ? { key: "support", text: plural(counts.support, "support message", "support messages"), issue: false, href: "/admin/support", roles: ["owner", "support"] } : null,
    counts.reviews ? { key: "reviews", text: `${plural(counts.reviews, "review", "reviews")} to moderate`, issue: false, href: "/admin/reviews", roles: ["owner", "support", "content"] } : null,
    counts.ai ? { key: "ai", text: `${plural(counts.ai, "AI work", "AI works")} to validate`, issue: false, href: "/admin/ai", roles: ["owner", "content"] } : null,
    low.data ? { key: "edition", text: low.data.label, issue: true, href: "/admin/editions", roles: ["owner", "fulfilment"] } : null,
    { key: "newsletter", text: "October newsletter draft", issue: false, href: "/admin/marketing", roles: ["owner"] },
  ];
  return list.filter((t): t is Todo => t !== null);
}

export function DashboardPage() {
  const { staff } = useAdmin();
  return (
    <AdminPage title={greeting(staff.fullName)} breadcrumbs={[{ label: "Overview", href: "/admin" }]} actions={hasRole(staff.role, "content") ? <ButtonLink href="/admin/works/" size="sm" trailing="+" className="min-h-36 min-w-140">New work</ButtonLink> : undefined} phone={<PhoneToday />} phoneTab="today" desktopHref="/admin/">
      <DesktopDashboard />
    </AdminPage>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────────

function DesktopDashboard() {
  const { staff } = useAdmin();
  const data = useAdminQuery(getDashboard, []);
  const orders = useAdminQuery(() => getOrders(), []);
  const todos = useTodos();
  const owner = staff.role === "owner";
  const seesOrders = hasRole(staff.role, ["support", "fulfilment"]);

  if (data.status === "loading" || orders.status === "loading" || !todos) return <Skeleton />;
  const d = data.data;
  const k = d.last30d;
  const tiles = [
    owner && { label: "Revenue · 30 d", value: formatPrice(k.revenueCents), context: k.revenueDelta, href: "/admin/finance/" },
    { label: "Orders · 30 d", value: String(k.orders), context: k.ordersDelta, href: seesOrders ? "/admin/orders/" : undefined },
    owner && { label: "Avg. order", value: `$${(k.avgOrderCents / 100).toFixed(1)}`, context: k.avgOrderDelta, href: "/admin/analytics/" },
    { label: "Conversion", value: `${k.conversionPct}%`, context: k.conversionDelta, href: owner ? "/admin/analytics/" : undefined },
    { label: "Guides finished", value: `${k.guidesFinishedPct}%`, context: "of guides started", href: owner ? "/admin/analytics/" : undefined },
    owner && { label: "Affiliate · 30 d", value: formatPrice(k.affiliateCents), context: "shopping lists", href: "/admin/marketing/" },
  ].filter((t): t is { label: string; value: string; context: string; href: string | undefined } => !!t);
  const myTodos = todos.filter((t) => hasRole(staff.role, t.roles));

  return (
    <>
      <div className="grid gap-12" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
        {tiles.map((t) => <KpiTile key={t.label} {...t} />)}
      </div>
      <div className="grid grid-cols-12 gap-16">
        {owner && <RevenueChart d={d} />}
        <AdminBox className={owner ? "col-span-4" : "col-span-12"}>
          <AdminTitle>To do today</AdminTitle>
          {myTodos.length === 0 ? (
            <p className="text-fg-muted">Nothing waiting. Enjoy the quiet.</p>
          ) : (
            <ul className="flex flex-col gap-14">
              {myTodos.map((t) => (
                <li key={t.key}>
                  <AdminRow cols="1fr auto" href={t.href}>
                    <StatusChip state={t.issue ? "issue" : "todo"} label={t.text} />
                    <span className="text-fg-muted" aria-hidden="true">→</span>
                  </AdminRow>
                </li>
              ))}
            </ul>
          )}
        </AdminBox>
      </div>
      <div className="grid grid-cols-12 gap-16">
        {seesOrders && <LatestOrders orders={orders.data.slice(0, 5)} />}
        <TopWorks works={d.topWorks.slice(0, 5)} wide={!seesOrders} links={hasRole(staff.role, "content")} />
      </div>
    </>
  );
}

function RevenueChart({ d }: { d: Dashboard }) {
  const [range, setRange] = useState<Range>(30);
  const days = d.days.slice(-range);
  const note = d.notes.find((n) => days.some((x) => x.day === n.day));
  const title = range === 90 ? `Revenue per day, ${monthSpan(days[0]!.day, days.at(-1)!.day)}` : `Revenue per day, ${d.monthName}`;
  return (
    <AdminBox className="col-span-8">
      <div className="flex items-center justify-between">
        <AdminTitle>{title}</AdminTitle>
        <div className="flex gap-6" role="group" aria-label="Range">
          {([7, 30, 90] as Range[]).map((r) => (
            <PillButton key={r} pressed={range === r} onClick={() => setRange(r)}>
              {r} d
            </PillButton>
          ))}
        </div>
      </div>
      <BarChart
        caption={title}
        note={note ? `${note.label} · ${note.text}` : ""}
        format={(v) => formatPrice(v)}
        data={days.map((x) => ({ label: x.label, value: x.revenueCents, tip: `${x.label} · ${formatPrice(x.revenueCents)} · ${plural(x.orders, "order", "orders")}` }))}
      />
    </AdminBox>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthSpan = (a: string, b: string) => `${MONTHS[Number(a.slice(5, 7)) - 1]}–${MONTHS[Number(b.slice(5, 7)) - 1]}`;

const LATEST_COLS = "90px 1fr 1.4fr 70px 140px";

function LatestOrders({ orders }: { orders: Order[] }) {
  return (
    <AdminBox className="col-span-7">
      <div className="flex justify-between">
        <AdminTitle>Latest orders</AdminTitle>
        <UnderLink href="/admin/orders/">All orders</UnderLink>
      </div>
      {/* A list of whole-row links under a drawn header row (links cannot be ARIA rows); each link reads its whole line. */}
      <div className="flex flex-col gap-14">
        <div aria-hidden="true">
          <AdminHeadRow cols={LATEST_COLS}>
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Total</span>
            <span>Status</span>
          </AdminHeadRow>
        </div>
        <ul aria-label="Latest orders" className="flex flex-col gap-14">
          {orders.map((o) => {
            const s = dashboardStatus(o);
            return (
              <li key={o.id}>
                <AdminRow cols={LATEST_COLS} href={orderHref(o)}>
                  <span>#{o.number}</span>
                  <span>{o.customer.fullName}</span>
                  <span className="text-fg-muted">{o.items.map((i) => i.title).join(" · ")}</span>
                  <span>{formatPrice(o.totalCents)}</span>
                  <StatusChip state={s.state} label={s.label} />
                </AdminRow>
              </li>
            );
          })}
        </ul>
      </div>
    </AdminBox>
  );
}

function TopWorks({ works, wide, links }: { works: Dashboard["topWorks"]; wide: boolean; links: boolean }) {
  const max = Math.max(1, works[0]?.guides ?? 1);
  const cols = "40px 60px 1fr 60px";
  return (
    <AdminBox className={wide ? "col-span-12" : "col-span-5"}>
      <div className="flex justify-between">
        <AdminTitle>Top works · 30 d</AdminTitle>
        {links && <UnderLink href="/admin/works/">Catalog</UnderLink>}
      </div>
      <ul className="flex flex-col gap-14">
        {works.map((w) => {
          const body = (
            <>
              <Artwork src={w.imageUrl} orientation={w.orientation} className="w-32" sizes="32px" />
              <span>{w.number}</span>
              <span className="relative h-8 bg-surface-muted" role="img" aria-label={`${w.guides} guides sold`}>
                <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${Math.floor((w.guides / max) * 100)}%` }} />
              </span>
              <span className="text-right tabular-nums">{w.guides}</span>
            </>
          );
          return (
            <li key={w.slug}>
              {links ? <AdminRow cols={cols} href={`/admin/works/${w.slug}/`}>{body}</AdminRow> : <AdminRow cols={cols} role="presentation">{body}</AdminRow>}
            </li>
          );
        })}
      </ul>
      <p className="text-fg-muted">Guides sold. Bar length relative to {works[0]?.number}.</p>
    </AdminBox>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-24">
      <div className="grid grid-cols-6 gap-12">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-128 bg-surface-muted" />)}</div>
      <div className="h-416 bg-surface-muted" />
    </div>
  );
}

// ── Phone (AdminMToday) ──────────────────────────────────────────────────────

function PhoneToday() {
  const { staff, counts } = useAdmin();
  const data = useAdminQuery(getDashboard, []);
  const orders = useAdminQuery(() => getOrders(), []);
  const owner = staff.role === "owner";
  const seesOrders = hasRole(staff.role, ["support", "fulfilment"]);
  if (data.status === "loading" || orders.status === "loading" || !counts) return <div aria-busy="true" aria-label="Loading" className="h-480 bg-surface-muted" />;
  const t = data.data.today;
  const tiles = [
    owner && { label: "Revenue", value: formatPrice(t.revenueCents), context: t.revenueDelta },
    { label: "Orders", value: String(t.orders), context: `${plural(t.guides, "guide", "guides")} · ${plural(t.prints, "print", "prints")}` },
    { label: "Visitors", value: String(t.visitors), context: `${t.phonePct}% phone` },
    { label: "Conversion", value: `${t.conversionPct}%`, context: t.conversionDelta },
  ].filter((x): x is { label: string; value: string; context: string } => !!x);
  const todos = [
    hasRole(staff.role, "fulfilment") && counts.fulfilment > 0 && { key: "ship", text: `${plural(counts.fulfilment, "print", "prints")} to ship before 16:00`, issue: true, href: "/admin/orders/" },
    hasRole(staff.role, "support") && counts.support > 0 && { key: "support", text: plural(counts.support, "support message", "support messages"), issue: false, href: "/admin/alerts/" },
    hasRole(staff.role, ["support", "content"]) && counts.reviews > 0 && { key: "reviews", text: `${plural(counts.reviews, "review", "reviews")} to moderate`, issue: false, href: "/admin/alerts/" },
  ].filter((x): x is { key: string; text: string; issue: boolean; href: string } => !!x);
  const initial = (name: string) => {
    const [first, last] = name.split(" ");
    return last ? `${first} ${last[0]}.` : name;
  };

  return (
    <>
      <h1 className="text-admin-title leading-20 font-medium tracking-heading">Today · {t.label}</h1>
      <div className="grid grid-cols-2 gap-10">
        {tiles.map((x) => <KpiTile key={x.label} size="sm" {...x} />)}
      </div>
      <h2 className="text-xs font-medium tracking-normal">To do</h2>
      {todos.length === 0 ? (
        <p className="text-fg-muted">Nothing waiting.</p>
      ) : (
        <ul className="-mt-12 flex flex-col">
          {todos.map((x) => (
            <li key={x.key} className="mt-12">
              <AdminRow cols="1fr auto" href={x.href} className="min-h-52">
                <StatusChip state={x.issue ? "issue" : "todo"} label={x.text} />
                <span className="text-fg-muted" aria-hidden="true">→</span>
              </AdminRow>
            </li>
          ))}
        </ul>
      )}
      {seesOrders && (
        <>
          <h2 className="text-xs font-medium tracking-normal">Latest</h2>
          <ul className="-mt-12 flex flex-col">
            {orders.data.slice(0, 3).map((o) => (
              <li key={o.id} className="mt-12">
                <AdminRow cols="1fr auto" href={orderHref(o)} className="min-h-52">
                  <span className="flex flex-col leading-16">
                    <span>#{o.number} · {initial(o.customer.fullName)}</span>
                    <span className="text-fg-muted">{o.items.map((i) => (i.kind === "gift_card" ? "Gift card" : i.title)).join(" · ")}</span>
                  </span>
                  <span>{formatPrice(o.totalCents)}</span>
                </AdminRow>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
