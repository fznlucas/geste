"use client";

/** /kit · Admin shell (M6): sidebar per role, top bar with search, "Demo data" role menu and alerts, shared admin parts. */
import { useState } from "react";
import {
  AdminBox, AdminHeadRow, AdminRow, AdminSearch, AdminSidebar, AdminTabs, AdminTitle, AdminTopBar, AlertsPopover, Button, DemoRoleMenu, PillButton, StatusChip, UnderLink,
} from "@/components";
import type { StaffRole } from "@/lib/types";

const COUNTS = { orders: 3, fulfilment: 3, editions: 1, ai: 5, support: 2, reviews: 4 };
const ALERTS = [
  { id: "a1", text: "3 prints to ship today", when: "09:12", href: "#" },
  { id: "a2", text: "2 new support messages", when: "08:02", href: "#" },
  { id: "a3", text: "4 reviews waiting", when: "yesterday", href: "#", read: true },
];

export function ShellKit() {
  const [role, setRole] = useState<StaffRole>("owner");
  const [tab, setTab] = useState("All");
  const [range, setRange] = useState("30 d");
  return (
    <div className="flex flex-col gap-24">
      <span className="text-fg-muted">Sidebar per role (switch with the “Demo data” menu) · top bar</span>
      {/* The console is a desktop layout (phones get the admin's own phone header): it scrolls sideways below 1100 px. */}
      <div role="region" aria-label="Admin shell at desktop width" tabIndex={0} className="relative overflow-x-auto focus-visible:outline focus-visible:outline-1 focus-visible:outline-fg">
      <div className="flex min-w-1100 border border-border">
        <AdminSidebar role={role} userName="Lucas" activeHref="/admin/orders" counts={COUNTS} onLogOut={() => {}} />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <AdminTopBar
            breadcrumbs={[{ label: "Sales", href: "#" }]}
            title="Orders"
            search={<AdminSearch onSearch={() => {}} />}
            demo={<DemoRoleMenu role={role} onRoleChange={setRole} onReset={() => {}} />}
            alerts={<AlertsPopover alerts={ALERTS} />}
            actions={<Button size="sm" variant="ghost" className="min-h-36">Export CSV</Button>}
          />
          <div className="flex flex-col gap-24 px-32 py-24">
            <div className="flex items-center justify-between">
              <AdminTabs label="Status" tabs={["All", "To ship", "Issues", "Done"]} value={tab} onChange={setTab} />
              <div className="flex gap-6">
                {["7 d", "30 d", "90 d"].map((r) => (
                  <PillButton key={r} pressed={range === r} onClick={() => setRange(r)}>{r}</PillButton>
                ))}
                <PillButton disabled>Disabled</PillButton>
              </div>
            </div>
            <AdminBox>
              <div className="flex justify-between"><AdminTitle>Latest orders</AdminTitle><UnderLink href="#">All orders</UnderLink></div>
              <div role="table" aria-label="Latest orders" className="flex flex-col gap-14">
              <AdminHeadRow cols="90px 1fr 70px 140px"><span role="columnheader">Order</span><span role="columnheader">Customer</span><span role="columnheader">Total</span><span role="columnheader">Status</span></AdminHeadRow>
              {([["#GS-2041", "Camille Martin", "$86", "issue", "Print to ship"], ["#GS-2040", "Hugo Petit", "$21", "done", "Delivered"], ["#GS-2038", "Inès Moreau", "$136", "todo", "Printed"]] as const).map(([n, c, t, st, l]) => (
                <AdminRow key={n} cols="90px 1fr 70px 140px" className="hover:bg-surface-hover">
                  <span role="cell">{n}</span><span role="cell">{c}</span><span role="cell">{t}</span><span role="cell"><StatusChip state={st} label={l} /></span>
                </AdminRow>
              ))}
              </div>
            </AdminBox>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
