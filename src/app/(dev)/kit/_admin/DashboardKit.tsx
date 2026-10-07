"use client";

/** /kit: dashboard and phone-shell pieces in every state (M6 "dashboard"). */
import { useState } from "react";
import { AdminMistPage, AdminPhoneHeader, AdminRow, AdminTabBar, AlertsPopover, BarChart, CurrencySwitch, FilterSummary, InfoTip, KpiTile, MistBlock, StatusChip, type CurrencyChoice } from "@/components";

function State({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <span className="text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

const SEPT = [58, 47, 84, 45, 79, 69, 49, 83, 51, 81, 57, 60, 85, 115, 68, 76, 107, 131, 106, 96, 138, 310, 133, 95, 86, 86, 101, 139, 96, 126];
const ALERTS = [
  { id: "a1", text: "3 prints to ship today", when: "09:12", href: "#" },
  { id: "a2", text: "N°08 L edition: 4 left", when: "08:40", href: "#" },
  { id: "a3", text: "2 new support messages", when: "08:02", href: "#", read: true },
];

function CurrencyStates() {
  const [c, setC] = useState<CurrencyChoice>("eur");
  return (
    <div className="flex gap-12">
      <CurrencySwitch value={c} onChange={setC} />
      <CurrencySwitch value="usd" onChange={() => {}} />
      <CurrencySwitch value="eur" onChange={() => {}} disabled />
    </div>
  );
}

export function DashboardKit() {
  return (
    <div className="flex flex-col gap-24">
      <State label="KpiTile · md linked (hover: Line-field border) · md without link (role cannot open the module)">
        <div className="grid grid-cols-3 gap-12">
          <KpiTile label="Revenue · 30 d" value="$5,278" context="+38% vs Aug" href="#" />
          <KpiTile label="Avg. order" value="$29.3" context="−2%" href="#" />
          <KpiTile label="Conversion" value="2.8%" context="+0.6 pt" />
        </div>
      </State>
      <State label="KpiTile with its “?” (definition + See the rows) · InfoTip alone · FilterSummary with and without filters">
        <div className="grid grid-cols-3 items-start gap-12">
          <KpiTile label="Revenue · 30 d" value="€3,412" context="excl. VAT · +12% vs Aug 7 – Sep 5" href="#" definition="Store turnover excl. VAT: guides, prints, shipping and gift cards used, minus refunds (EUR)." rowsHref="#" />
          <span className="flex items-center gap-8">Turnover <InfoTip label="Turnover" definition="Money received for guides, prints, shipping and gift cards used, minus refunds (cash basis)." rowsHref="#" /></span>
          <span className="flex flex-col gap-6">
            <FilterSummary count="42 orders" filters={["To ship", "paid Sep 6 – Oct 5"]} onClear={() => {}} />
            <FilterSummary count="1,204 orders" filters={[]} />
          </span>
        </div>
      </State>
      <State label="CurrencySwitch (top bar) · EUR excl. VAT (default) · USD charged · disabled">
        <CurrencyStates />
      </State>
      <State label="MistBlock (loading, still) · AdminMistPage desktop and phone (the admin while the history is prepared)">
        <div className="flex flex-col gap-12">
          <MistBlock className="h-44 w-320" />
          <div className="flex border border-border"><AdminMistPage busy={false} /></div>
          <div className="flex w-390 border border-border"><AdminMistPage phone busy={false} /></div>
        </div>
      </State>
      <State label="KpiTile · sm (AdminMToday)">
        <div className="grid w-358 grid-cols-2 gap-10">
          <KpiTile size="sm" label="Revenue" value="$278" context="+22% vs Tue" />
          <KpiTile size="sm" label="Orders" value="11" context="8 guides · 3 prints" />
        </div>
      </State>
      <State label="BarChart · 30 d with annotation (hover or focus a bar: Ink bar + tooltip) · 7 d without">
        <div className="grid grid-cols-2 gap-16">
          <BarChart caption="Revenue per day, September" note="Sep 22 · TikTok “first canvas” ep. 04 posted" data={SEPT.map((v, i) => ({ label: `Sep ${i + 1}`, value: v, tip: `Sep ${i + 1} · $${v}` }))} />
          <BarChart caption="Revenue per day, September" note="" data={SEPT.slice(-7).map((v, i) => ({ label: `Sep ${i + 24}`, value: v, tip: `Sep ${i + 24} · $${v}` }))} />
        </div>
      </State>
      <State label="To-do rows · issue (Signal) · waiting (hollow) · done">
        <div className="flex w-400 flex-col gap-14 border border-border bg-surface p-20">
          <AdminRow cols="1fr auto" href="#"><StatusChip state="issue" label="3 prints to pack and ship" /><span className="text-fg-muted">→</span></AdminRow>
          <AdminRow cols="1fr auto" href="#"><StatusChip state="todo" label="2 support messages" /><span className="text-fg-muted">→</span></AdminRow>
          <AdminRow cols="1fr auto" role="group"><StatusChip state="done" label="Delivered" /><StatusChip state="off" label="Off" /></AdminRow>
        </div>
      </State>
      <State label="AlertsPopover · closed / open (click): unread count, read alert dimmed">
        <div className="relative h-300 border border-dashed border-border-dashed">
          <div className="flex justify-end p-14 pr-32"><AlertsPopover alerts={ALERTS} /></div>
        </div>
      </State>
      <State label="Phone header + tab bar · Today / Orders / Alerts current / none">
        <div className="flex gap-24">
          {(["today", "orders", "alerts", null] as const).map((t) => (
            <div key={String(t)} className="flex w-390 flex-col border border-border">
              <AdminPhoneHeader desktopHref="#" />
              <div className="h-40" />
              <AdminTabBar current={t} />
            </div>
          ))}
        </div>
      </State>
    </div>
  );
}
