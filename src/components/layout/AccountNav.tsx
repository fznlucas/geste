import Link from "next/link";
import { cn } from "@/lib/cn";

export type AccountSection = "library" | "orders" | "settings";

const LINKS: Array<[AccountSection, string, string]> = [
  ["library", "Library", "/account"],
  ["orders", "Orders", "/account/orders"],
  ["settings", "Settings", "/account/settings"],
];

export interface AccountNavProps {
  current: AccountSection;
  /** "Hi Camille" */
  firstName: string;
  onLogOut: () => void;
  /** desktop = left column (Account, Orders, Settings boards); phone = title + tab row (MAccount…). */
  variant?: "desktop" | "phone";
}

/**
 * "Hi Camille" and the account sections. Desktop: a column, the current link underlined, "Log out"
 * in Stone below. Phone: the greeting as a 28 px title over a row of 44 px tabs, "Log out" last.
 * The greeting is the page's h1 in both.
 */
export function AccountNav({ current, firstName, onLogOut, variant = "desktop" }: AccountNavProps) {
  if (variant === "phone") {
    return (
      <>
        <h1 className="text-lg font-medium">Hi {firstName}</h1>
        <nav aria-label="Account" className="flex gap-20 border-b border-border">
          {LINKS.map(([key, label, href]) => (
            <Link
              key={key}
              href={href}
              aria-current={key === current ? "page" : undefined}
              className={cn("flex min-h-44 items-center", key === current ? "underline underline-offset-6" : "text-fg-muted hover:text-fg")}
            >
              {label}
            </Link>
          ))}
          <button type="button" onClick={onLogOut} className="ml-auto flex min-h-44 items-center text-fg-muted hover:text-fg">
            Log out
          </button>
        </nav>
      </>
    );
  }
  return (
    <nav aria-label="Account" className="flex flex-col gap-4">
      <h1 className="mb-12 text-xs font-medium tracking-normal">Hi {firstName}</h1>
      {LINKS.map(([key, label, href]) => (
        <Link
          key={key}
          href={href}
          aria-current={key === current ? "page" : undefined}
          className={cn("block min-h-28", key === current ? "underline underline-offset-4" : "hover:text-fg-muted")}
        >
          {label}
        </Link>
      ))}
      {/* A 20 px line as drawn; 2 px padding cancelled by -2 px margins makes a 24 px target (WCAG 2.2). */}
      <button type="button" onClick={onLogOut} className="-mb-2 mt-10 self-start py-2 text-left text-fg-muted hover:text-fg">
        Log out
      </button>
    </nav>
  );
}
