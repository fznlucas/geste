"use client";

/**
 * Every /admin page but the login (docs/screens/admin.md): staff guard (`useRequireStaff`, → /admin/login?next=),
 * the sidebar with its counts (≥ 768 px), the admin toasts ("Done · demo action", 1.6 s) and the context the
 * pages read (who is signed in, which role, sidebar counts). Pages render <AdminPage> for the top bar.
 */
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { AdminSidebar, ToastProvider, activeNavHref } from "@/components";
import { todoCounts, type AdminCounts } from "@/lib/metrics";
import { signOutStaff, useAdminQuery, useRequireStaff, type StaffSession } from "@/lib/client";
import { advanceJobs } from "@/lib/client/admin/ai";
import { AlertNotifier } from "./AlertNotifier";
import { useMediaQuery } from "@/lib/useMediaQuery";

interface AdminContext {
  staff: StaffSession;
  counts: AdminCounts | null;
  /** ≥ 768 px: sidebar + top bar; below: the phone admin (AdminM* boards). */
  desktop: boolean;
}

const Ctx = createContext<AdminContext | null>(null);

export function useAdmin(): AdminContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin must be used inside the admin layout");
  return c;
}

export function AdminFrame({ children }: { children: ReactNode }) {
  const state = useRequireStaff();
  const counts = useAdminQuery(todoCounts, []);
  const desktop = useMediaQuery("(min-width: 768px)");
  const path = usePathname();
  const router = useRouter();
  const role = state.status === "signed_in" ? state.session.role : null;
  // The simulated GPU worker: jobs move on while any admin page is open, not only the AI page.
  useEffect(() => {
    if (role !== "owner" && role !== "content") return;
    const t = setInterval(() => document.visibilityState === "visible" && advanceJobs(), 2000);
    return () => clearInterval(t);
  }, [role]);

  if (state.status !== "signed_in") return <div aria-busy="true" className="min-h-dvh bg-bg" />;
  const staff = state.session;
  const logOut = () => {
    signOutStaff();
    router.replace("/admin/login");
  };

  return (
    <Ctx.Provider value={{ staff, counts: counts.data ?? null, desktop }}>
      <ToastProvider surface="admin">
        <AlertNotifier />
        {desktop ? (
          <div className="flex min-h-dvh bg-bg">
            <AdminSidebar role={staff.role} userName={staff.fullName} activeHref={activeNavHref(path)} counts={counts.data ?? {}} onLogOut={logOut} twoFactor={staff.aal2} />
            <div className="relative flex min-w-0 flex-1 flex-col">{children}</div>
          </div>
        ) : (
          // Phone: header, scrolling main, tab bar in the flow (a sticky bar would cover the last targets of the page).
          <div className="flex h-dvh flex-col bg-bg">{children}</div>
        )}
      </ToastProvider>
    </Ctx.Provider>
  );
}
