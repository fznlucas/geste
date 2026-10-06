"use client";

/**
 * One admin page: top bar (breadcrumb, title, search, "Demo data" role menu, alerts, page actions)
 * and main on desktop; the phone header + bottom tabs below 768 px. A role that cannot open the
 * page sees a short notice instead (the sidebar already hides the link).
 */
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  AdminMain, AdminPhoneHeader, AdminSearch, AdminTabBar, AdminTopBar, AlertsPopover, ButtonLink, DemoRoleMenu, ROLE_LABEL,
  useToast, type AdminPhoneTab, type Crumb,
} from "@/components";
import { getCustomers, getOrders, getWorks } from "@/lib/api";
import { alerts as getAlerts } from "@/lib/metrics";
import { adminStore, hasRole, setDemoRole, useAdminQuery } from "@/lib/client";
import type { StaffRole } from "@/lib/types";
import { useAdmin } from "./AdminFrame";

export interface AdminPageProps {
  title: ReactNode;
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
}

export function AdminPage({ title, breadcrumbs, actions, roles, children, phone, phoneTab = null, desktopHref = "/admin", mainClassName }: AdminPageProps) {
  const { staff, desktop } = useAdmin();
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
        breadcrumbs={breadcrumbs}
        title={title}
        search={<TopSearch />}
        demo={<DemoMenu />}
        alerts={<Alerts />}
        actions={allowed ? actions : undefined}
      />
      <AdminMain className={mainClassName}>{body}</AdminMain>
    </>
  );
}

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
  return (
    <DemoRoleMenu
      role={staff.role}
      onRoleChange={(r) => {
        setDemoRole(r);
        toast.show(`Viewing as ${ROLE_LABEL[r]}`);
      }}
      onReset={() => {
        adminStore.reset();
        toast.show("Demo data reset");
      }}
    />
  );
}

function Alerts() {
  const { staff } = useAdmin();
  const alerts = useAdminQuery(getAlerts, []);
  const list = (alerts.data ?? []).filter((a) => hasRole(staff.role, a.roles));
  return <AlertsPopover alerts={list} />;
}

/** Order number → the order; customer name or email → the customer; "N°03" → the work; otherwise the orders list. */
function TopSearch() {
  const router = useRouter();
  const { staff } = useAdmin();
  const search = async (q: string) => {
    const low = q.toLowerCase();
    if (hasRole(staff.role, ["support", "fulfilment"])) {
      const order = (await getOrders({ search: q })).find((o) => o.number.toLowerCase().includes(low.replace(/^#/, "")));
      if (order) return router.push(`/admin/orders/detail?number=${order.number}`);
    }
    if (hasRole(staff.role, "support")) {
      const customer = (await getCustomers({ search: q }))[0];
      if (customer) return router.push(`/admin/customers/detail/?id=${customer.id}`);
    }
    if (hasRole(staff.role, "content")) {
      const digits = low.replace(/[^0-9]/g, "");
      const work = digits ? (await getWorks({ status: "all" })).find((w) => Number(w.number.slice(2)) === Number(digits)) : undefined;
      if (work) return router.push(`/admin/works/${work.slug}`);
    }
    if (hasRole(staff.role, ["support", "fulfilment"])) router.push(`/admin/orders?q=${encodeURIComponent(q)}`);
  };
  return <AdminSearch onSearch={search} />;
}
