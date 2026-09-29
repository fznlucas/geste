"use client";

/**
 * /admin/finance (AdminFinance), owner only: KPI row, P&L of the month, VAT by country (OSS),
 * turnover threshold, payouts. "Export for accountant (CSV)" downloads the P&L, VAT and payouts.
 * Mock: the board's September figures (`getFinance`); later `v_pnl_monthly` + the Stripe balance.
 */
import { useState } from "react";
import { AdminBox, AdminHeadRow, AdminRow, AdminTitle, KpiTile, PillButton, StatusChip } from "@/components";
import { financeCsv, getFinance, type Finance } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { exportForAccountant } from "@/lib/client/admin/marketing";
import { formatPrice } from "@/lib/format";
import { AdminPage } from "../../_admin/AdminPage";

/** "$4,212", "−$286" (whole dollars, as on the board). */
const usd = (cents: number, cost = false) => (cents < 0 || cost ? `−${formatPrice(Math.abs(cents))}` : formatPrice(cents));
/** Admin boards write "Sep 26", "Oct 3" (the store's shortDate writes "Sept"). */
const day = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
};

export function FinancePage() {
  const q = useAdminQuery(getFinance, []);
  return (
    <AdminPage title="Finance" breadcrumbs={[{ label: "Growth", href: "/admin/analytics" }]} roles={["owner"]} desktopHref="/admin/finance">
      {q.status === "loading" ? <div aria-busy="true" aria-label="Loading" className="h-640 bg-surface-muted" /> : <Body f={q.data} />}
    </AdminPage>
  );
}

function Body({ f }: { f: Finance }) {
  const [exported, setExported] = useState(false);
  // "Revenue · Sept": the board abbreviates September to four letters.
  const mon = f.month === "September" ? "Sept" : f.month.slice(0, 3);
  const download = () => {
    const blob = new Blob([financeCsv(f)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `geste-finance-2026-09.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    exportForAccountant(f.month);
    setExported(true);
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-12 md:grid-cols-5">
        <KpiTile label={`Revenue · ${mon}`} value={usd(f.revenueCents)} context="VAT incl." href="#pnl" />
        <KpiTile label="Gross margin" value={usd(f.grossMarginCents)} context={`${f.grossMarginPct}%`} href="#pnl" />
        <KpiTile label={`Costs · ${mon}`} value={usd(f.costsCents)} context="see below" href="#pnl" />
        <KpiTile label="Net result" value={usd(f.netCents)} context="before tax & social charges" href="#pnl" />
        {f.nextPayout && <KpiTile label="Next payout" value={usd(f.nextPayout.cents)} context={`Stripe · ${day(f.nextPayout.date)}`} href="#payouts" />}
      </div>
      <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-12">
        <AdminBox id="pnl" className="scroll-mt-24 md:col-span-7">
          <div className="flex flex-wrap justify-between gap-12">
            <AdminTitle>Profit &amp; loss · {f.month}</AdminTitle>
            <PillButton onClick={download}>{exported ? "CSV downloaded" : "Export for accountant (CSV)"}</PillButton>
          </div>
          <div role="table" aria-label={`Profit and loss, ${f.month}`} className="flex flex-col gap-14">
            <AdminHeadRow cols="1fr 110px 110px">
              <span role="columnheader">Line</span>
              <span role="columnheader" className="text-right">Amount</span>
              <span role="columnheader" className="text-right">Share</span>
            </AdminHeadRow>
            {f.pnl.map((r) => (
              <AdminRow key={r.label} cols="1fr 110px 110px">
                <span role="rowheader" className={r.total ? "font-medium" : undefined}>{r.label}</span>
                <span role="cell" className="text-right">{usd(r.cents, r.cost)}</span>
                <span role="cell" className="text-right text-fg-muted">{r.sharePct === null ? "" : `${r.sharePct}%`}</span>
              </AdminRow>
            ))}
          </div>
        </AdminBox>
        <div className="flex flex-col gap-16 md:col-span-5">
          <AdminBox>
            <AdminTitle>VAT collected · Q3</AdminTitle>
            <div role="table" aria-label="VAT collected, Q3" className="flex flex-col gap-14">
              {f.vat.map((v) => (
                <AdminRow key={v.country} cols="1fr 70px 90px">
                  <span role="rowheader">{v.country}</span>
                  <span role="cell" className="text-fg-muted">{v.rate}</span>
                  <span role="cell" className="text-right">{v.cents === null ? "—" : usd(v.cents)}</span>
                </AdminRow>
              ))}
            </div>
            <span className="text-fg-muted">Digital sales to EU consumers follow the buyer’s country rate (OSS). Check with your accountant.</span>
          </AdminBox>
          <AdminBox>
            <AdminTitle>Turnover threshold · 2026</AdminTitle>
            <span>
              {usd(f.turnover.cents)} of {f.turnover.thresholdCents === null ? "[threshold for your status]" : usd(f.turnover.thresholdCents)}
            </span>
            <span role="meter" aria-label="Turnover against the threshold" aria-valuenow={f.turnover.pct} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${f.turnover.pct}%`} className="relative h-10 bg-surface-muted">
              <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${Math.min(100, f.turnover.pct)}%` }} />
            </span>
            <span className="text-fg-muted">Micro-enterprise and VAT thresholds: enter the figures your accountant confirms.</span>
          </AdminBox>
          <AdminBox id="payouts" className="scroll-mt-24">
            <AdminTitle>Payouts</AdminTitle>
            <div role="table" aria-label="Payouts" className="flex flex-col gap-14">
              {f.payouts.map((p) => (
                <AdminRow key={p.id} cols="1fr 90px 100px">
                  <span role="rowheader" className="text-fg-muted">{day(p.date)}</span>
                  <span role="cell">{usd(p.cents)}</span>
                  <span role="cell"><StatusChip state={p.status === "paid" ? "done" : "todo"} label={p.status === "paid" ? "Paid" : "Scheduled"} /></span>
                </AdminRow>
              ))}
            </div>
          </AdminBox>
        </div>
      </div>
    </>
  );
}
