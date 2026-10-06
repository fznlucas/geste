import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../brand/Logo";
import { Badge } from "../primitives/Badge";
import { cn } from "@/lib/cn";
import type { StaffRole } from "@/lib/types";

export interface NavItem {
  label: string;
  href: string;
  /** Key of the sidebar count (`getAdminCounts`). */
  count?: "orders" | "fulfilment" | "editions" | "ai" | "support" | "reviews";
  roles: StaffRole[];
  /** Other paths that light this item (order detail → Orders). */
  match?: RegExp;
}

/** "Guide editor" opens the published N°03 guide, as on the boards. */
export const GUIDE_EDITOR_HREF = "/admin/works/n03/guide/00000000-0000-0000-0000-0000000000a3";

/** docs/admin.md "Roles". Items a role cannot use are not rendered. */
export const ADMIN_NAV: Array<{ group: string; items: NavItem[] }> = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/admin", roles: ["owner", "support", "fulfilment", "content"] }] },
  {
    group: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", count: "orders", roles: ["owner", "support", "fulfilment"], match: /^\/admin\/orders/ },
      { label: "Fulfilment", href: "/admin/fulfilment", count: "fulfilment", roles: ["owner", "fulfilment"] },
      // Content reads the stock (the work editor links here); closing and reopening stay with Fulfilment.
      { label: "Print editions", href: "/admin/editions", count: "editions", roles: ["owner", "fulfilment", "content"] },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Works", href: "/admin/works", roles: ["owner", "content"], match: /^\/admin\/works(?!\/[^/]+\/guide)/ },
      { label: "Guide editor", href: GUIDE_EDITOR_HREF, roles: ["owner", "content"], match: /^\/admin\/works\/[^/]+\/guide/ },
      { label: "AI pipeline", href: "/admin/ai", count: "ai", roles: ["owner", "content"] },
    ],
  },
  {
    group: "Customers",
    items: [
      { label: "Customers", href: "/admin/customers", roles: ["owner", "support"], match: /^\/admin\/customers/ },
      { label: "Support inbox", href: "/admin/support", count: "support", roles: ["owner", "support"] },
      { label: "Reviews & results", href: "/admin/reviews", count: "reviews", roles: ["owner", "support", "content"] },
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

export const ROLE_LABEL: Record<StaffRole, string> = { owner: "Owner", support: "Support", fulfilment: "Fulfilment", content: "Content" };

/** Can this role open that admin page? Read from the navigation's roles (owner opens everything). */
export function canOpenAdmin(role: StaffRole, href: string): boolean {
  if (role === "owner") return true;
  const p = href.replace(/[?#].*$/, "").replace(/\/$/, "") || "/admin";
  for (const g of ADMIN_NAV) for (const i of g.items) if (i.href === p || i.match?.test(p)) return i.roles.includes(role);
  return true;
}

/** The nav item a path belongs to (for `aria-current`). */
export function activeNavHref(path: string): string | null {
  const p = path.replace(/\/$/, "") || "/admin";
  for (const g of ADMIN_NAV) for (const i of g.items) if (i.href === p || i.match?.test(p)) return i.href;
  return null;
}

const navLink = "flex min-h-32 items-center justify-between px-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg";

export interface AdminSidebarProps {
  role: StaffRole;
  userName: string;
  activeHref: string | null;
  counts: Partial<Record<NonNullable<NavItem["count"]>, number>>;
  /** "Log out": ends the staff session (the caller navigates to /admin/login). */
  onLogOut?: () => void;
}

/** 232 px sidebar content (257 px with its 12 px padding and rule, as the boards measure it) (AdminDashboard): logo, grouped nav with counts (active row inverted to Ink), store link, who, log out. */
export function AdminSidebar({ role, userName, activeHref, counts, onLogOut }: AdminSidebarProps) {
  return (
    <aside className="flex w-257 shrink-0 flex-col gap-20 border-r border-border px-12 py-16">
      <Link href="/admin" className="flex min-h-40 items-center gap-8 px-10 hover:text-fg-muted">
        <Logo size={12} />
        <span className="text-fg-muted">admin</span>
      </Link>
      <nav aria-label="Admin" className="flex flex-col gap-20">
        {ADMIN_NAV.map((g) => {
          const items = g.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={g.group} className="flex flex-col gap-2">
              <span className="mb-4 px-10 text-fg-muted">{g.group}</span>
              {items.map((i) => {
                const on = i.href === activeHref;
                return (
                  <Link key={i.href} href={i.href} aria-current={on ? "page" : undefined} className={cn(navLink, on ? "bg-fg text-fg-inverse" : "hover:bg-surface-muted")}>
                    <span>{i.label}</span>
                    {i.count && <Badge count={counts[i.count] ?? 0} />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-16">
        <Link href="/" className={cn(navLink, "hover:bg-surface-muted")}>
          <span>View the store</span>
          <span aria-hidden="true">↗</span>
        </Link>
        {role === "owner" ? (
          <Link href="/admin/settings" className={cn(navLink, "hover:bg-surface-muted")}>
            <span>{userName} · {ROLE_LABEL[role]}</span>
            <span className="text-fg-muted">2FA on</span>
          </Link>
        ) : (
          <span className={navLink}>
            <span>{userName} · {ROLE_LABEL[role]}</span>
            <span className="text-fg-muted">2FA on</span>
          </span>
        )}
        <button type="button" onClick={onLogOut} className={cn(navLink, "w-full cursor-pointer text-fg-muted hover:bg-surface-muted hover:text-fg")}>
          Log out
        </button>
      </div>
    </aside>
  );
}

export interface Crumb {
  label: string;
  /** Absent: shown as text (a page the signed-in role cannot open). */
  href?: string;
}

export interface AdminTopBarProps {
  breadcrumbs: Crumb[];
  title: ReactNode;
  /** Search field, "Demo data" menu, alerts button: in this order before the page actions. */
  search?: ReactNode;
  demo?: ReactNode;
  alerts?: ReactNode;
  actions?: ReactNode;
}

/** Top bar: breadcrumb "Sales /" + 20 px title, then search · Demo data · Alerts · page actions. */
export function AdminTopBar({ breadcrumbs, title, search, demo, alerts, actions }: AdminTopBarProps) {
  return (
    <header className="flex items-center justify-between gap-16 border-b border-border px-32 py-14">
      <div className="flex min-w-0 flex-col gap-2">
        <nav aria-label="Breadcrumb" className="flex gap-8 text-fg-muted">
          {breadcrumbs.map((b) => (
            <span key={(b.href ?? "") + b.label} className="flex gap-8">
              {b.href ? <Link href={b.href} className="-my-2 inline-flex min-h-24 items-center hover:text-fg">{b.label}</Link> : <span className="-my-2 inline-flex min-h-24 items-center">{b.label}</span>}
              <span aria-hidden="true">/</span>
            </span>
          ))}
        </nav>
        <h1 className="text-admin-title font-medium tracking-heading">{title}</h1>
      </div>
      <div className="flex items-center gap-10">
        {search}
        {demo}
        {alerts}
        {actions}
      </div>
    </header>
  );
}

export interface AdminShellProps extends AdminSidebarProps, AdminTopBarProps {
  children: ReactNode;
}

/** Sidebar + top bar + main (24 32 40 padding, 24 px gaps). The app composes the parts in its admin layout. */
export function AdminShell({ role, userName, activeHref, counts, onLogOut, children, ...bar }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <AdminSidebar role={role} userName={userName} activeHref={activeHref} counts={counts} onLogOut={onLogOut} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <AdminTopBar {...bar} />
        <AdminMain>{children}</AdminMain>
      </div>
    </div>
  );
}

export function AdminMain({ children, className }: { children: ReactNode; className?: string }) {
  return <main className={cn("flex min-h-0 flex-1 flex-col gap-24 px-32 pb-40 pt-24", className)}>{children}</main>;
}

// ── Phone (AdminMToday, AdminMOrders, AdminMOrder, AdminMAlerts) ─────────────

/** "geste.studio admin" + "Desktop ↗": 44 px row, 8 px 16 px padding (AdminM* boards). */
export function AdminPhoneHeader({ desktopHref }: { desktopHref: string }) {
  return (
    <header className="flex min-h-60 items-center justify-between px-16 py-8">
      <Link href="/admin" className="flex min-h-44 items-center gap-8 hover:text-fg-muted">
        <Logo size={12} />
        <span className="text-fg-muted">admin</span>
      </Link>
      <a href={desktopHref} target="_blank" rel="noreferrer" className="flex min-h-44 items-center text-fg-muted hover:text-fg">
        Desktop ↗
      </a>
    </header>
  );
}

export type AdminPhoneTab = "today" | "orders" | "alerts";

/** Bottom tab bar: Today · Orders · Alerts, 56 px, Line rule; the current one Ink and underlined, the others Stone. */
export function AdminTabBar({ current }: { current: AdminPhoneTab | null }) {
  const tabs: Array<[AdminPhoneTab, string, string]> = [
    ["today", "Today", "/admin"],
    ["orders", "Orders", "/admin/orders"],
    ["alerts", "Alerts", "/admin/alerts"],
  ];
  return (
    <nav aria-label="Admin" className="flex shrink-0 border-t border-border bg-bg">
      {tabs.map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={current === key ? "page" : undefined}
          className={cn(
            "flex min-h-56 grow items-center justify-center focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-fg",
            current === key ? "text-fg underline underline-offset-4" : "text-fg-muted hover:text-fg",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
