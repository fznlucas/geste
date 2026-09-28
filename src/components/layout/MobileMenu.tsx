"use client";

import Link from "next/link";
import { Drawer } from "../overlay/Drawer";
import { MAIN_NAV } from "./SiteHeader";

/** Full-screen menu (board MMenu): large 22 px links, then account + help, then EN/FR. */
export function MobileMenu({ open, onOpenChange, signedIn }: { open: boolean; onOpenChange: (o: boolean) => void; signedIn: boolean }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Menu" side="full">
      <nav aria-label="Main" className="flex flex-col gap-8 pt-24">
        {MAIN_NAV.map((n) => (
          <Link key={n.href} href={n.href} onClick={() => onOpenChange(false)} className="text-md">
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-40 flex flex-col gap-4 border-t border-border pt-16">
        <Link href={signedIn ? "/account" : "/login"} className="min-h-44 content-center">{signedIn ? "Library" : "Log in"}</Link>
        <Link href="/help" className="min-h-44 content-center">Help</Link>
        <Link href="/gift-cards" className="min-h-44 content-center">Gift cards</Link>
      </div>
    </Drawer>
  );
}
