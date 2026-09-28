import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { Badge } from "../primitives/Badge";
import { cn } from "@/lib/cn";
import type { StaffRole } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  count?: number;
  roles: StaffRole[];
}

export const ADMIN_NAV: Array<{ group: string; items: NavItem[] }> = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/admin", roles: ["owner", "support", "fulfilment", "content"] }] },
  {
    group: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", roles: ["owner", "support", "fulfilment"] },
      { label: "Fulfilment", href: "/admin/fulfilment", roles: ["owner", "fulfilment"] },
      { label: "Print editions", href: "/admin/editions", roles: ["owner", "fulfilment"] },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Works", href: "/admin/works", roles: ["owner", "content"] },
      { label: "Guide editor", href: "/admin/works/guide", roles: ["owner", "content"] },
      { label: "AI pipeline", href: "/admin/ai", roles: ["owner", "content"] },
    ],
  },
  {
    group: "Customers",
    items: [
      { label: "Customers", href: "/admin/customers", roles: ["owner", "support"] },
      { label: "Support inbox", href: "/admin/support", roles: ["owner", "support"] },
      { label: "Reviews & results", href: "/admin/reviews", roles: ["owner", "support", "content"] },
    ],
  },
  {
    group: "Growth",
    items: [
      { label: "Analytics", href: "/admin/analytics", roles: ["owner"] },
      { label: "Finance", href: "/admin/finance", roles: ["owner"] },
      { label: "Marketing", href: "/admin/marketing", roles: ["owner"] },
      { label: "Content", href: "/admin/content", roles: ["owner", "content"] },
    ],
  },
  { group: "Studio", items: [{ label: "Settings & team", href: "/admin/settings", roles: ["owner"] }] },
];

export interface AdminShellProps {
  role: StaffRole;
  userName: string;
  currentHref: string;
  counts: Partial<Record<string, number>>; // keyed by href
  title: string;
  breadcrumbs: Array<{ label: string; href: string }>;
  actions?: ReactNode;
  alerts?: ReactNode; // <Popover> with the alerts list
  search?: ReactNode;
  children: ReactNode;
}

/**
 * 232 px sidebar (grouped nav with counts, active row inverted to Ink) + top bar (breadcrumb, 20 px title,
 * search, alerts, page actions) + main (24 32 40 padding, 24 px gaps). Items the role cannot use are not rendered.
 */
export function AdminShell({ role, userName, currentHref, counts, title, breadcrumbs, actions, alerts, search, children }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="flex w-232 shrink-0 flex-col gap-20 border-r border-border px-12 py-16">
        <Link href="/admin" className="flex min-h-40 items-center gap-8 px-10">
          <Logo size={12} />
          <span className="text-fg-muted">admin</span>
        </Link>
        {ADMIN_NAV.map((g) => {
          const items = g.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.group} className="flex flex-col gap-2">
              <span className="mb-4 px-10 text-fg-muted">{g.group}</span>
              {items.map((i) => {
                const on = i.href === currentHref;
                return (
                  <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cn("flex min-h-32 items-center justify-between px-10", on ? "bg-fg text-fg-inverse" : "hover:bg-surface-muted")}>
                    <span>{i.label}</span>
                    <Badge count={counts[i.href] ?? 0} />
                  </Link>
                );
              })}
            </div>
          );
        })}
        <div className="mt-auto flex flex-col gap-2 border-t border-border pt-16">
          <Link href="/" className="flex min-h-32 items-center justify-between px-10 hover:bg-surface-muted">
            View the store <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/admin/settings" className="flex min-h-32 items-center justify-between px-10 hover:bg-surface-muted">
            {userName} · {role[0]!.toUpperCase() + role.slice(1)} <span className="text-fg-muted">2FA on</span>
          </Link>
          <form action="/admin/logout" method="post">
            <button type="submit" className="flex min-h-32 w-full items-center px-10 text-fg-muted hover:bg-surface-muted">Log out</button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-16 border-b border-border px-32 py-14">
          <div className="flex flex-col gap-2">
            <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted">
              {breadcrumbs.map((b) => (
                <span key={b.href} className="flex gap-8">
                  <Link href={b.href} className="hover:text-fg">{b.label}</Link>
                  <span aria-hidden="true">/</span>
                </span>
              ))}
            </nav>
            <h1 className="text-admin-title">{title}</h1>
          </div>
          <div className="flex items-center gap-10">
            {search}
            {alerts}
            {actions}
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-24 px-32 pb-40 pt-24">{children}</main>
      </div>
    </div>
  );
}
