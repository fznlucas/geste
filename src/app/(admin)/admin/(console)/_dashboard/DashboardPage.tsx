"use client";

/**
 * /admin (AdminDashboard ≥ 768 px, AdminMToday below). KPI tiles link to their module; the revenue
 * chart (7 / 30 / 90 d) and the money tiles are the owner's only (docs/admin.md "✓ no revenue"); the
 * to-do list shows the modules the role can open, with the sidebar's live counts; latest orders come
 * from getOrders, so an order paid at checkout in this browser tops the list and moves the numbers.
 */
import { useRouter, useSearchParams } from "next/navigation";
import { AdminBox, AdminHeadRow, AdminRow, AdminTitle, Artwork, BarChart, Button, KpiTile, PillButton, StatusChip, UnderLink, useToast } from "@/components";
import { createWork } from "@/lib/client/admin/catalog";
import { getOrders, type Order } from "@/lib/api";
import { dashboard, modeCounts, todoItems, type Dashboard, type TodoItem } from "@/lib/metrics";
import { hasRole, useAdminQuery } from "@/lib/client";
import { parisHour } from "@/lib/clock";
import { formatPrice } from "@/lib/format";

/** The books' figures: EUR excl. VAT (docs/admin-v2/02); order totals stay what the customer paid (USD). */
const eur = (cents: number) => formatPrice(cents, "en", "EUR");
import type { StatusState } from "@/lib/types";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

type Range = 7 | 30 | 90;

const orderHref = (o: Order) => `/admin/orders/detail/?number=${o.number}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function greeting(name: string) {
  const h = parisHour();
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

/** "To do today": one line per module with something waiting (`todoItems`, the same counts as the sidebar). */
function useTodos(): TodoItem[] | null {
  const items = useAdminQuery(todoItems, []);
  return items.status === "loading" ? null : items.data;
}

export function DashboardPage() {
  const { staff } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  // "New work +": a draft, then its editor (the same as the Catalog's).
  const newWork = async () => {
    try {
      const slug = await createWork();
      router.push(`/admin/works/draft?slug=${slug}`);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not create the work.", { tone: "danger" });
    }
  };
  return (
    <AdminPage title={greeting(staff.fullName)} breadcrumbs={[{ label: "Overview", href: "/admin" }]} actions={hasRole(staff.role, "content") ? <Button size="sm" trailing="+" onClick={newWork} className="min-h-36 min-w-140">New work</Button> : undefined} phone={<PhoneToday />} phoneTab="today" desktopHref="/admin/">
      <DesktopDashboard />
    </AdminPage>
  );
}

// ── Desktop ──────────────────────────────────────────────────────────────────

/** ?range=7|30|90: the tiles and the chart (30 days by default). */
function useRange(): [Range, (r: Range) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const r = Number(params.get("range"));
  const range: Range = r === 7 || r === 90 ? r : 30;
  return [range, (next) => router.replace(next === 30 ? "/admin/" : `/admin/?range=${next}`, { scroll: false })];
}

function DesktopDashboard() {
  const { staff } = useAdmin();
  const [range, setRange] = useRange();
  const data = useAdminQuery(() => dashboard(range), [range]);
  const orders = useAdminQuery(() => getOrders(), []);
  const todos = useTodos();
  const owner = staff.role === "owner";
  const seesOrders = hasRole(staff.role, ["support", "fulfilment"]);

  if (data.status === "loading" || orders.status === "loading" || !todos) return <Skeleton />;
  const d = data.data;
  const k = d.last30d;
  const span = `${d.period.from}..${d.period.to}`;
  const analytics = `/admin/analytics/?range=${range === 90 ? 90 : range === 7 ? 7 : 30}`;
  // Each tile opens the place its number comes from, for the same days (docs/admin-v2/04 Dashboard).
  const tiles = [
    owner && { label: `Revenue · ${range} d`, value: eur(k.revenueCents), context: k.revenueDelta, href: `/admin/finance/?period=${span}` },
    { label: `Orders · ${range} d`, value: String(k.orders), context: k.ordersDelta, href: seesOrders ? `/admin/orders/?from=${d.period.from}&to=${d.period.to}` : undefined },
    owner && { label: "Avg. order", value: `€${(k.avgOrderCents / 100).toFixed(1)}`, context: k.avgOrderDelta, href: `${analytics}#basket` },
    { label: "Conversion", value: `${k.conversionPct}%`, context: k.conversionDelta, href: owner ? `${analytics}#funnel` : undefined },
    { label: "Guides finished", value: `${k.guidesFinishedPct}%`, context: "of guides started", href: owner ? `${analytics}#completion` : undefined },
    owner && { label: `Affiliate · ${range} d`, value: eur(k.affiliateCents), context: "shopping lists", href: "/admin/marketing/?tab=affiliate" },
  ].filter((t): t is { label: string; value: string; context: string; href: string | undefined } => !!t);
  const myTodos = todos.filter((t) => hasRole(staff.role, t.roles));

  return (
    <>
      <div className="grid gap-12" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
        {tiles.map((t) => <KpiTile key={t.label} {...t} />)}
      </div>
      {owner && <IntegrationsLine />}
      <div className="grid grid-cols-12 gap-16">
        {owner && <RevenueChart d={d} range={range} setRange={setRange} />}
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
        <TopWorks works={d.topWorks.slice(0, 5)} wide={!seesOrders} links={hasRole(staff.role, "content")} range={range} />
      </div>
    </>
  );
}

/** "Mock: 34 · Live: 0": where the data comes from, linking to Settings › Integrations (docs/admin-v2/03 §4). */
function IntegrationsLine() {
  const c = modeCounts();
  return (
    <p className="text-fg-muted">
      Integrations · Mock: {c.mock} · Live: {c.live}{c.off ? ` · Off: ${c.off}` : ""} ·{" "}
      <UnderLink href="/admin/settings/?tab=Integrations">Settings</UnderLink>
    </p>
  );
}

function RevenueChart({ d, range, setRange }: { d: Dashboard; range: Range; setRange: (r: Range) => void }) {
  const days = d.days.slice(-range);
  const note = d.notes.find((n) => days.some((x) => x.day === n.day));
  const title = `Revenue per day, ${monthSpan(days[0]!.day, days.at(-1)!.day)}`;
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
        format={(v) => eur(v)}
        data={days.map((x) => ({ label: x.label, value: x.revenueCents, tip: `${x.label} · ${eur(x.revenueCents)} · ${plural(x.orders, "order", "orders")}`, href: `/admin/orders/?from=${x.day}&to=${x.day}` }))}
      />
    </AdminBox>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "September", or "July–September" when the days span months. */
const monthSpan = (a: string, b: string) => (a.slice(0, 7) === b.slice(0, 7) ? MONTHS[Number(a.slice(5, 7)) - 1]! : `${MONTHS[Number(a.slice(5, 7)) - 1]}–${MONTHS[Number(b.slice(5, 7)) - 1]}`);

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

function TopWorks({ works, wide, links, range }: { works: Dashboard["topWorks"]; wide: boolean; links: boolean; range: number }) {
  const max = Math.max(1, works[0]?.guides ?? 1);
  const cols = "40px 60px 1fr 60px";
  return (
    <AdminBox className={wide ? "col-span-12" : "col-span-5"}>
      <div className="flex justify-between">
        <AdminTitle>Top works · {range} d</AdminTitle>
        {links && <UnderLink href="/admin/works/?sort=sales">Catalog</UnderLink>}
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
  const data = useAdminQuery(dashboard, []);
  const orders = useAdminQuery(() => getOrders(), []);
  const items = useAdminQuery(todoItems, []);
  const owner = staff.role === "owner";
  const seesOrders = hasRole(staff.role, ["support", "fulfilment"]);
  if (data.status === "loading" || orders.status === "loading" || items.status === "loading" || !counts) return <div aria-busy="true" aria-label="Loading" className="h-480 bg-surface-muted" />;
  const t = data.data.today;
  const tiles = [
    owner && { label: "Revenue", value: eur(t.revenueCents), context: t.revenueDelta },
    { label: "Orders", value: String(t.orders), context: `${plural(t.guides, "guide", "guides")} · ${plural(t.prints, "print", "prints")}` },
    { label: "Visitors", value: String(t.visitors), context: `${t.phonePct}% phone` },
    { label: "Conversion", value: `${t.conversionPct}%`, context: t.conversionDelta },
  ].filter((x): x is { label: string; value: string; context: string } => !!x);
  // The same lines as the desktop "To do today" (`todoItems`), in the phone's wording.
  const todos = (items.data ?? [])
    .filter((x) => x.phone && hasRole(staff.role, x.roles))
    .map((x) => ({ key: x.key, text: x.phone!.text, issue: x.issue, href: x.phone!.href }));
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
