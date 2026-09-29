"use client";

/**
 * Frame of /account, /account/orders, /account/settings (boards Account, Orders, Settings and their
 * M* versions): client guard (→ /login?next=), "Hi Camille" nav, skeleton while the session is read.
 * Desktop: nav in the first 3 of 12 columns, the page places its own column. Phone: title and tabs,
 * then the page, stacked with the board's gap.
 */
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AccountNav, type AccountSection } from "@/components";
import { signOut, useHydrated, useRequireCustomer, type CustomerSession } from "@/lib/client";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/useMediaQuery";

export interface AccountView {
  phone: boolean;
  session: CustomerSession;
}

export function AccountFrame({ current, phoneGap, children }: { current: AccountSection; phoneGap: string; children: (view: AccountView) => ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const auth = useRequireCustomer();
  const desktop = useMediaQuery("(min-width: 1200px)");
  const logOut = () => {
    signOut();
    router.push("/");
  };

  if (!hydrated || auth.status !== "signed_in") {
    return (
      <div aria-busy="true" className="flex flex-col gap-14 px-16 pt-16 lg:mx-auto lg:grid lg:w-full lg:max-w-1440 lg:grid-cols-12 lg:gap-x-40 lg:px-120 lg:pt-56">
        <span className="sr-only">Loading your account</span>
        <div className="h-34 w-160 bg-surface-muted lg:col-span-3 lg:h-120" />
        <div className="h-480 bg-surface-muted lg:col-span-9" />
      </div>
    );
  }

  const view = { phone: !desktop, session: auth.session };
  if (!desktop) {
    return (
      <div className={cn("flex flex-col px-16 pt-16", phoneGap)}>
        <AccountNav variant="phone" current={current} firstName={auth.session.firstName} onLogOut={logOut} />
        {children(view)}
      </div>
    );
  }
  return (
    <div className="mx-auto grid w-full max-w-1440 grid-cols-12 content-start gap-x-40 px-120 pt-56">
      <div className="col-span-3">
        <AccountNav current={current} firstName={auth.session.firstName} onLogOut={logOut} />
      </div>
      {children(view)}
    </div>
  );
}
