"use client";

/**
 * One admin page: top bar (breadcrumb, title, search, "Demo data" role menu, alerts, page actions)
 * and main on desktop; the phone header + bottom tabs below 768 px. A role that cannot open the
 * page sees a short notice instead (the sidebar already hides the link).
 */
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import {
  AdminMain, AdminPhoneHeader, AdminSearch, AdminTabBar, AdminTopBar, AlertsPopover, canOpenAdmin, ButtonLink, CurrencySwitch, DemoRoleMenu, ROLE_LABEL,
  useToast, type AdminPhoneTab, type Crumb,
} from "@/components";
import { adminSearch } from "@/lib/api";
import { alerts as getAlerts, simulationStatus } from "@/lib/metrics";
import { asset } from "@/lib/asset";
import { clockOverride, setClockOverride } from "@/lib/clock";
import { purchasesStore } from "@/lib/client/purchases";
import { adminStore, hasRole, setDemoRole, useAdminCurrency, useAdminQuery } from "@/lib/client";
import { markAlertRead, markAlertsRead } from "@/lib/client/admin/alerts";
import type { StaffRole } from "@/lib/types";
import { useAdmin } from "./AdminFrame";

export interface AdminPageProps {
  title: ReactNode;
  /** The line under the title: what the page is for and the period in view (docs/admin-v2/06 §6). */
  subtitle?: ReactNode;
  breadcrumbs: Crumb[];
  /** Page actions at the right of the top bar ("New work  +", "Export CSV"). */
  actions?: ReactNode;
  /** Roles that may open the page (docs/admin.md); the owner always can. Omit for everyone. */
  roles?: StaffRole[];
  children: ReactNode;
  /**
   * Phone layout (AdminM* boards). Omitted: the desktop content, stacked in the phone frame.
   * `phoneTab` lights a bottom tab.
   */
  phone?: ReactNode;
  phoneTab?: AdminPhoneTab | null;
  /** Page path, opened by the phone header's "Desktop ↗". */
  desktopHref?: string;
  mainClassName?: string;
  /** The money display switch in the top bar (EUR excl. VAT / USD charged): pages with store-side money (orders, customers). */
  currency?: boolean;
}

export function AdminPage({ title, subtitle, breadcrumbs, actions, roles, children, phone, phoneTab = null, desktopHref = "/admin", mainClassName, currency = false }: AdminPageProps) {
  const { staff, desktop } = useAdmin();
  const pathname = usePathname();
  const allowed = !roles || hasRole(staff.role, roles);
  const body = allowed ? children : <NoAccess role={staff.role} />;

  if (!desktop) {
    return (
      <>
        <AdminPhoneHeader desktopHref={desktopHref} />
        <main className="flex min-h-0 flex-1 flex-col gap-12 overflow-auto px-16 pb-24 pt-8 [&>*]:shrink-0">{allowed ? (phone ?? (
          <>
            {/* Pages without a phone board: their title, then the desktop content stacked. */}
            <h1 className="text-admin-title font-medium tracking-heading">{title}</h1>
            {children}
          </>
        )) : body}</main>
        <AdminTabBar current={phoneTab} />
      </>
    );
  }
  return (
    <>
      <AdminTopBar
        // A crumb is a link only to another page the role can open.
        breadcrumbs={breadcrumbs.map((b) => (b.href && (!canOpenAdmin(staff.role, b.href) || samePage(b.href, pathname)) ? { label: b.label } : b))}
        title={title}
        subtitle={allowed ? subtitle : undefined}
        search={<TopSearch />}
        demo={<DemoMenu />}
        alerts={<Alerts />}
        actions={allowed ? (currency ? <><TopCurrency />{actions}</> : actions) : undefined}
      />
      <AdminMain className={mainClassName}>{body}</AdminMain>
    </>
  );
}

const samePage = (href: string, path: string) => href.replace(/[?#].*$/, "").replace(/\/$/, "") === path.replace(/\/$/, "");

function NoAccess({ role }: { role: StaffRole }) {
  return (
    <div className="flex max-w-480 flex-col gap-16 border border-border bg-surface p-20">
      <p>The {ROLE_LABEL[role]} role cannot open this page.</p>
      <p className="text-fg-muted">Switch role in “Demo data” to try another view.</p>
      <ButtonLink href="/admin" variant="ghost" className="self-start">Back to the dashboard</ButtonLink>
    </div>
  );
}

function DemoMenu() {
  const { staff } = useAdmin();
  const toast = useToast();
  const [clock, setClock] = useState(() => clockOverride());
  const sim = simulationStatus();
  return (
    <span className="flex items-center gap-6">
      {clock && (
        <button
          type="button"
          onClick={() => {
            setClockOverride(null);
            setClock(null);
            toast.show("Clock back to real time");
            window.location.reload();
          }}
          className="inline-flex min-h-24 cursor-pointer items-center bg-surface-muted px-8 py-4 font-mono text-xs text-fg hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
          aria-label={`Clock fixed at ${clockLabel(clock)}: back to real time`}
        >
          Clock: {clockLabel(clock)} · reset
        </button>
      )}
      <DemoRoleMenu
        role={staff.role}
        onRoleChange={(r) => {
          setDemoRole(r);
          toast.show(`Viewing as ${ROLE_LABEL[r]}`);
        }}
        onReset={() => {
          // Every admin change and every purchase made in this browser (the session stays).
          adminStore.reset();
          purchasesStore.reset();
          toast.show("Demo data reset");
        }}
        simulatedUpTo={sim.time}
        simulationHref={hasRole(staff.role, "owner") ? asset("admin/settings/?tab=Simulation") : undefined}
      />
    </span>
  );
}

/** "Oct 2, 12:00" (Paris). */
const clockLabel = (iso: string) => new Date(iso).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(/^(\d+) (\w+),/, "$2 $1,");

function Alerts() {
  const { staff } = useAdmin();
  const alerts = useAdminQuery(getAlerts, []);
  const list = (alerts.data ?? []).filter((a) => a.desktop && hasRole(staff.role, a.roles));
  return <AlertsPopover alerts={list} onOpen={(id) => markAlertRead(id)} onMarkAll={markAlertsRead} />;
}

/** Order number → the order; customer name or email → the customer; "N°03" → the work; otherwise the orders list. */
function TopSearch() {
  const router = useRouter();
  const { staff } = useAdmin();
  // Grouped results across the admin; a role only sees what it can open (docs/admin-v2/04 Shell).
  const search = useCallback(
    async (q: string) => (await adminSearch(q)).map((g) => ({ ...g, hits: g.hits.filter((h) => canOpenAdmin(staff.role, h.href)) })).filter((g) => g.hits.length),
    [staff.role],
  );
  return <AdminSearch search={search} onOpen={(href) => router.push(href)} />;
}

function TopCurrency() {
  const [currency, setCurrency] = useAdminCurrency();
  return <CurrencySwitch value={currency} onChange={setCurrency} />;
}
