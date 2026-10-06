"use client";

/**
 * /admin/alerts: AdminMAlerts on phones (bottom tab "Alerts"); on desktop the same list as the top
 * bar popover, full page. "Mark read" dims the alert; push topics are kept in the admin overlay
 * (no permission prompt in the mock; web push later).
 */
import Link from "next/link";
import { AdminBox, AdminRow, AdminTitle, PillButton } from "@/components";
import { PUSH_TOPICS, getPushSettings } from "@/lib/api";
import { alerts as getAlerts, type AdminAlert } from "@/lib/metrics";
import { hasRole, useAdminQuery } from "@/lib/client";
import { markAlertRead, setPushTopic } from "@/lib/client/admin/alerts";
import { cn } from "@/lib/cn";
import { AdminPage } from "../../_admin/AdminPage";
import { useAdmin } from "../../_admin/AdminFrame";

export function AlertsPage() {
  return (
    <AdminPage title="Alerts" breadcrumbs={[{ label: "Overview", href: "/admin" }]} phone={<PhoneAlerts />} phoneTab="alerts" desktopHref="/admin/alerts/">
      <DesktopAlerts />
    </AdminPage>
  );
}

function useAlerts(phone: boolean) {
  const { staff } = useAdmin();
  const q = useAdminQuery(getAlerts, []);
  if (q.status === "loading") return null;
  const mine = q.data.filter((a) => hasRole(staff.role, a.roles));
  return phone
    ? mine.filter((a) => a.phone).sort((a, b) => a.phone!.rank - b.phone!.rank).map((a) => ({ ...a, text: a.phone!.text, href: a.phone!.href }))
    : mine;
}

function AlertRow({ a, cols = "1fr auto", className, children }: { a: AdminAlert; cols?: string; className?: string; children?: React.ReactNode }) {
  return (
    <AdminRow cols={cols} role="presentation" className={cn(className, a.read && "text-fg-muted")}>
      {children}
      <PillButton onClick={() => !a.read && markAlertRead(a.id)} aria-label={a.read ? `${a.text}: read` : `Mark read: ${a.text}`}>
        {a.read ? "Read" : "Mark read"}
      </PillButton>
    </AdminRow>
  );
}

function PushSettings() {
  const q = useAdminQuery(getPushSettings, []);
  if (q.status === "loading") return null;
  return (
    <>
      {PUSH_TOPICS.map((t) => (
        <label key={t.id} className="flex min-h-44 cursor-pointer items-center justify-between">
          <span>{t.label}</span>
          <input type="checkbox" checked={q.data[t.id]} onChange={(e) => setPushTopic(t.id, e.target.checked)} className="accent-fg" />
        </label>
      ))}
    </>
  );
}

function PhoneAlerts() {
  const alerts = useAlerts(true);
  return (
    <>
      <h1 className="text-admin-title leading-20 font-medium tracking-heading">Alerts</h1>
      {alerts === null ? (
        <div aria-busy="true" aria-label="Loading" className="h-280 bg-surface-muted" />
      ) : alerts.length === 0 ? (
        <p className="text-fg-muted">Nothing new.</p>
      ) : (
        <ul className="-mt-12 flex flex-col">
          {alerts.map((a) => (
            <li key={a.id} className="mt-12">
              <AlertRow a={a} className="min-h-56">
                <span className="flex flex-col leading-16">
                  <span>{a.text}</span>
                  <span className="text-fg-muted">{a.when}</span>
                </span>
              </AlertRow>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-8 text-xs font-medium tracking-normal">Push notifications</h2>
      <div className="-mt-12 flex flex-col [&>*]:mt-12">
        <PushSettings />
      </div>
    </>
  );
}

function DesktopAlerts() {
  const alerts = useAlerts(false);
  return (
    <div className="grid grid-cols-12 gap-16">
      <AdminBox className="col-span-8">
        <AdminTitle>Latest</AdminTitle>
        {alerts === null ? (
          <div aria-busy="true" aria-label="Loading" className="h-280 bg-surface-muted" />
        ) : alerts.length === 0 ? (
          <p className="text-fg-muted">Nothing new.</p>
        ) : (
          <ul className="flex flex-col gap-14">
            {alerts.map((a) => (
              <li key={a.id}>
                <AlertRow a={a} cols="1fr 90px auto">
                  <Link href={a.href} className="hover:text-fg-muted">{a.text}</Link>
                  <span className="text-fg-muted">{a.when}</span>
                </AlertRow>
              </li>
            ))}
          </ul>
        )}
      </AdminBox>
      <AdminBox className="col-span-4">
        <AdminTitle>Push notifications</AdminTitle>
        <div className="flex flex-col">
          <PushSettings />
        </div>
      </AdminBox>
    </div>
  );
}
