"use client";

/**
 * /admin/finance (AdminFinance), owner only, in EUR excluding VAT for a French micro-entreprise
 * (docs/admin-v2/02): KPI row and four tabs — P&L (the board's view: P&L, VAT by country, turnover
 * threshold, payouts), Taxes & URSSAF, Cash & payouts, Ledger. Period and tab live in the URL
 * (`?period=2026-09&tab=pnl`). Every figure comes from the books (`@/lib/metrics` → `src/lib/ledger`).
 */
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminBox, AdminHeadRow, AdminRow, AdminTabs, AdminTitle, Input, KpiTile, PillButton, Select, StatusChip, useToast } from "@/components";
import { finance, financeCsv, financeFec, financePeriodOptions, financePeriodSlug, ledgerLines, type Finance, type LedgerAccount, type UrssafDeclaration } from "@/lib/metrics";
import { useAdminQuery } from "@/lib/client";
import { exportBooks, markUrssafDeclared, markUrssafPaid, markVatDeclared, markVatPaid } from "@/lib/client/admin/finance";
import { formatPrice } from "@/lib/format";
import { AdminPage } from "../../_admin/AdminPage";

type Tab = "pnl" | "taxes" | "cash" | "ledger";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "pnl", label: "P&L" },
  { value: "taxes", label: "Taxes & URSSAF" },
  { value: "cash", label: "Cash & payouts" },
  { value: "ledger", label: "Ledger" },
];

/** "€3,472.54", "−€146.40": the books' money, EUR excl. VAT. */
const eur = (cents: number, cost = false) => (cents < 0 || cost ? `−${formatPrice(Math.abs(cents), "en", "EUR")}` : formatPrice(cents, "en", "EUR"));
/** Admin boards write "Sep 26", "Oct 3". */
const day = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "Europe/Paris" })} ${Number(d.toLocaleString("en-US", { day: "numeric", timeZone: "Europe/Paris" }))}`;
};
const CATEGORY: Record<string, string> = { sales_goods: "Sales of goods (prints, shipping)", services_bic: "Services BIC (guides)", services_bnc: "Services BNC (affiliate)" };
const STATUS: Record<UrssafDeclaration["status"], { state: "done" | "todo" | "issue" | "off"; label: string }> = {
  in_progress: { state: "off", label: "In progress" },
  to_declare: { state: "todo", label: "To declare" },
  late: { state: "issue", label: "Late" },
  declared: { state: "todo", label: "Declared, to pay" },
  paid: { state: "done", label: "Paid" },
};

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function FinancePage() {
  const params = useSearchParams();
  const period = params.get("period");
  const q = useAdminQuery(() => finance(period), [period]);
  return (
    <AdminPage title="Finance" breadcrumbs={[{ label: "Growth", href: "/admin/analytics" }]} roles={["owner"]} desktopHref="/admin/finance">
      {q.status === "loading" ? <div aria-busy="true" aria-label="Loading" className="h-640 bg-surface-muted" /> : <Body f={q.data} />}
    </AdminPage>
  );
}

function Body({ f }: { f: Finance }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (TABS.some((t) => t.value === params.get("tab")) ? params.get("tab") : "pnl") as Tab;
  const accounts = (params.get("accounts")?.split(",").filter(Boolean) ?? []) as LedgerAccount[];
  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) if (v === null) p.delete(k);
    else p.set(k, v);
    router.replace(`/admin/finance/?${p.toString()}`, { scroll: false });
  };
  const slug = financePeriodSlug(f.period);
  const [exported, setExported] = useState<string | null>(null);
  const exportCsv = () => {
    download(`geste-finance-${slug}.csv`, financeCsv(f), "text/csv;charset=utf-8");
    exportBooks(f.month, "CSV");
    setExported("CSV downloaded");
  };
  const exportFec = () => {
    download(`geste-FEC-${slug}.txt`, financeFec(f), "text/plain;charset=utf-8");
    exportBooks(f.month, "FEC");
    setExported("FEC downloaded");
  };
  const mon = f.month;
  return (
    <>
      <PeriodPicker f={f} onChange={(value) => go({ period: value })} />
      <div className="grid grid-cols-2 gap-12 md:grid-cols-5">
        <KpiTile label={`Revenue · ${mon}`} value={eur(f.revenueCents)} context="turnover, excl. VAT" href="?tab=pnl#pnl" />
        <KpiTile label="Gross margin" value={eur(f.grossMarginCents)} context={`${f.grossMarginPct}%`} href="?tab=pnl#pnl" />
        <KpiTile label={`Costs · ${mon}`} value={eur(f.costsCents)} context="overheads, see below" href="?tab=pnl#pnl" />
        <KpiTile label="Net result" value={eur(f.netCents)} context="before URSSAF & income tax" href="?tab=pnl#pnl" />
        {f.nextPayout && <KpiTile label="Next payout" value={eur(f.nextPayout.cents)} context={`Stripe · ${day(f.nextPayout.date)}`} href="?tab=cash" />}
      </div>
      <AdminTabs tabs={TABS} value={tab} onChange={(t) => go({ tab: t, accounts: null })} label="Finance views" />
      {tab === "pnl" && <PnlTab f={f} onRow={(acc) => go({ tab: "ledger", accounts: acc.join(",") })} onCsv={exportCsv} onFec={exportFec} exported={exported} />}
      {tab === "taxes" && <TaxesTab f={f} />}
      {tab === "cash" && <CashTab f={f} />}
      {tab === "ledger" && <LedgerTab f={f} accounts={accounts} onClear={() => go({ accounts: null })} onCsv={exportCsv} onFec={exportFec} exported={exported} />}
    </>
  );
}

function PeriodPicker({ f, onChange }: { f: Finance; onChange: (value: string) => void }) {
  const options = useMemo(() => financePeriodOptions(), []);
  const current = options.find((o) => o.value === financePeriodSlug(f.period))?.value ?? "custom";
  const [custom, setCustom] = useState(current === "custom");
  const [from, setFrom] = useState(f.period.from);
  const [to, setTo] = useState(f.period.to);
  return (
    <div className="flex flex-wrap items-end gap-12">
      <label className="flex flex-col gap-6">
        <span className="text-fg-muted">Period</span>
        <Select
          aria-label="Period"
          value={custom ? "custom" : current}
          onChange={(e) => {
            if (e.target.value === "custom") return setCustom(true);
            setCustom(false);
            onChange(e.target.value);
          }}
        >
          {(["Month", "Quarter", "Year"] as const).map((g) => (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
          <option value="custom">Custom…</option>
        </Select>
      </label>
      {custom && (
        <>
          <label className="flex flex-col gap-6"><span className="text-fg-muted">From</span><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="flex flex-col gap-6"><span className="text-fg-muted">To</span><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
          <PillButton onClick={() => from && to && from <= to && onChange(`${from}..${to}`)}>Show</PillButton>
        </>
      )}
      <span className="text-fg-muted">EUR excluding VAT · micro-entreprise, cash basis</span>
    </div>
  );
}

function PnlTab({ f, onRow, onCsv, onFec, exported }: { f: Finance; onRow: (accounts: LedgerAccount[]) => void; onCsv: () => void; onFec: () => void; exported: string | null }) {
  return (
    <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-12">
      <AdminBox id="pnl" className="scroll-mt-24 md:col-span-7">
        <div className="flex flex-wrap justify-between gap-12">
          <AdminTitle>Profit &amp; loss · {f.month}</AdminTitle>
          <div className="flex flex-wrap gap-6">
            <PillButton onClick={onCsv}>{exported === "CSV downloaded" ? "CSV downloaded" : "Export for accountant (CSV)"}</PillButton>
            <PillButton onClick={onFec}>{exported === "FEC downloaded" ? "FEC downloaded" : "FEC file"}</PillButton>
          </div>
        </div>
        <div role="table" aria-label={`Profit and loss, ${f.month}`} className="flex flex-col gap-14">
          <AdminHeadRow cols="1fr 110px 70px">
            <span role="columnheader">Line</span>
            <span role="columnheader" className="text-right">Amount</span>
            <span role="columnheader" className="text-right">Share</span>
          </AdminHeadRow>
          {f.pnl.map((r) => {
            const cells = (
              <>
                <span role="rowheader" className={r.total ? "font-medium" : r.memo ? "text-fg-muted" : undefined}>{r.label}</span>
                <span role="cell" className={r.memo ? "text-right text-fg-muted" : "text-right"}>{eur(r.cents, r.cost)}</span>
                <span role="cell" className="text-right text-fg-muted">{r.sharePct === null ? "" : `${r.sharePct}%`}</span>
              </>
            );
            return r.accounts.length && !r.total ? (
              <button key={r.key} type="button" role="row" aria-label={`${r.label}: see the ledger lines`} onClick={() => onRow(r.accounts)} className="grid min-h-44 cursor-pointer items-center gap-12 text-left hover:bg-surface-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg" style={{ gridTemplateColumns: "1fr 110px 70px" }}>
                {cells}
              </button>
            ) : (
              <AdminRow key={r.key} cols="1fr 110px 70px">{cells}</AdminRow>
            );
          })}
        </div>
      </AdminBox>
      <div className="flex flex-col gap-16 md:col-span-5">
        <AdminBox>
          <AdminTitle>VAT collected · {f.month}</AdminTitle>
          <div role="table" aria-label={`VAT collected, ${f.month}`} className="flex flex-col gap-14">
            {f.vat.map((v) => (
              <AdminRow key={v.country} cols="1fr 70px 90px">
                <span role="rowheader">{v.country}</span>
                <span role="cell" className="text-fg-muted">{v.rate}</span>
                <span role="cell" className="text-right">{v.cents === null ? "—" : eur(v.cents)}</span>
              </AdminRow>
            ))}
          </div>
          <span className="text-fg-muted">Regime: VAT collected ({f.vat.length ? "rates of the buyer's country" : "none"}). OSS registration: to do. Switzerland and outside the EU are exports at 0 %. Check with your accountant.</span>
        </AdminBox>
        <AdminBox>
          <AdminTitle>Turnover threshold · {f.period.to.slice(0, 4)}</AdminTitle>
          <span>{eur(f.turnover.cents)} of {f.turnover.thresholdCents === null ? "[threshold for your status]" : eur(f.turnover.thresholdCents)}</span>
          <span role="meter" aria-label="Turnover against the threshold" aria-valuenow={f.turnover.pct} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${f.turnover.pct}%`} className="relative h-10 bg-surface-muted">
            <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${Math.min(100, f.turnover.pct)}%` }} />
          </span>
          <span className="text-fg-muted">Micro-entreprise services ceiling, year to date. Every threshold is in Taxes &amp; URSSAF; confirm the figures with your accountant.</span>
        </AdminBox>
        <AdminBox id="payouts" className="scroll-mt-24">
          <AdminTitle>Payouts</AdminTitle>
          <Payouts f={f} limit={4} />
        </AdminBox>
      </div>
    </div>
  );
}

function Payouts({ f, limit }: { f: Finance; limit?: number }) {
  return (
    <div role="table" aria-label="Payouts" className="flex flex-col gap-14">
      {f.payouts.slice(0, limit).map((p) => (
        <AdminRow key={p.id} cols="1fr 100px 130px">
          <span role="rowheader" className="text-fg-muted">{day(p.date)}</span>
          <span role="cell" className="text-right">{eur(p.cents)}</span>
          <span role="cell"><StatusChip state={p.status === "paid" ? "done" : "todo"} label={p.status === "paid" ? "Paid" : p.status === "in_transit" ? "On its way" : "Scheduled"} /></span>
        </AdminRow>
      ))}
    </div>
  );
}

function TaxesTab({ f }: { f: Finance }) {
  const toast = useToast();
  const act = (fn: () => void, done: string) => {
    try {
      fn();
      toast.show(done);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not save", { tone: "danger" });
    }
  };
  const copy = (d: UrssafDeclaration) => {
    const text = (Object.keys(d.turnoverByCategory) as Array<keyof typeof d.turnoverByCategory>).map((c) => `${CATEGORY[c]}: ${(d.turnoverByCategory[c] / 100).toFixed(0)} €`).join("\n");
    void navigator.clipboard?.writeText(text);
    toast.show(`Figures of ${d.label} copied`);
  };
  return (
    <div className="flex flex-col gap-16">
      <AdminBox>
        <AdminTitle>URSSAF declarations · {f.declarations[0]?.label ? "quarterly" : ""}</AdminTitle>
        <div role="table" aria-label="URSSAF declarations" className="flex flex-col gap-14">
          <AdminHeadRow cols="110px 1fr 120px 120px 150px 1fr">
            <span role="columnheader">Period</span>
            <span role="columnheader">Turnover by category</span>
            <span role="columnheader" className="text-right">To pay</span>
            <span role="columnheader">Due</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Actions</span>
          </AdminHeadRow>
          {f.declarations.map((d) => (
            <AdminRow key={d.key} cols="110px 1fr 120px 120px 150px 1fr">
              <span role="rowheader">{d.label}</span>
              <span role="cell" className="flex flex-col text-fg-muted">
                {(Object.keys(d.turnoverByCategory) as Array<keyof typeof d.turnoverByCategory>).filter((c) => d.turnoverByCategory[c]).map((c) => <span key={c}>{CATEGORY[c]} · {eur(d.turnoverByCategory[c])}</span>)}
              </span>
              <span role="cell" className="text-right">{eur(d.totalCents)}</span>
              <span role="cell">{day(d.dueDate)}</span>
              <span role="cell"><StatusChip state={STATUS[d.status].state} label={STATUS[d.status].label + (d.by === "simulated" ? " · simulated" : "")} /></span>
              <span role="cell" className="flex flex-wrap gap-6">
                {(d.status === "to_declare" || d.status === "late") && <PillButton onClick={() => act(() => markUrssafDeclared(d.key, d.label, d.status), `${d.label} marked as declared`)}>Mark as declared</PillButton>}
                {(d.status === "to_declare" || d.status === "late" || d.status === "declared") && <PillButton onClick={() => act(() => markUrssafPaid(d.key, d.label, d.status, d.totalCents), `${d.label} marked as paid`)}>Mark as paid</PillButton>}
                {d.status !== "in_progress" && <PillButton onClick={() => copy(d)}>Copy figures</PillButton>}
              </span>
            </AdminRow>
          ))}
        </div>
        <span className="text-fg-muted">Contributions 12.3 % on sales of goods, 21.2 % on BIC services, 25.6 % on BNC services, plus CFP; declared quarterly by the last day of the month after the quarter. Rates to confirm with your accountant.</span>
        <span className="text-fg-muted">Prints sold by the artist may fall under the artist-author scheme instead of micro BIC: ask your accountant.</span>
      </AdminBox>
      {f.vatReturns.length > 0 && (
        <AdminBox>
          <AdminTitle>VAT returns (CA3) · {f.vatReturns[0]?.key.includes("Q") ? "quarterly" : "monthly"}</AdminTitle>
          <div role="table" aria-label="VAT returns" className="flex flex-col gap-14">
            <AdminHeadRow cols="110px 1fr 120px 120px 150px 1fr">
              <span role="columnheader">Period</span>
              <span role="columnheader">VAT collected, net of refunds</span>
              <span role="columnheader" className="text-right">To pay</span>
              <span role="columnheader">Due</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Actions</span>
            </AdminHeadRow>
            {f.vatReturns.map((v) => (
              <AdminRow key={v.key} cols="110px 1fr 120px 120px 150px 1fr">
                <span role="rowheader">{v.label}</span>
                <span role="cell" className="text-fg-muted">{v.status === "in_progress" ? "So far" : "Whole period"}</span>
                <span role="cell" className="text-right">{eur(v.amountCents)}</span>
                <span role="cell">{day(v.dueDate)}</span>
                <span role="cell"><StatusChip state={STATUS[v.status].state} label={STATUS[v.status].label + (v.by === "simulated" ? " · simulated" : "")} /></span>
                <span role="cell" className="flex flex-wrap gap-6">
                  {(v.status === "to_declare" || v.status === "late") && <PillButton onClick={() => act(() => markVatDeclared(v.key, v.label, v.status), `${v.label} VAT return marked as filed`)}>Mark as declared</PillButton>}
                  {(v.status === "to_declare" || v.status === "late" || v.status === "declared") && <PillButton onClick={() => act(() => markVatPaid(v.key, v.label, v.status, v.amountCents), `${v.label} VAT marked as paid`)}>Mark as paid</PillButton>}
                </span>
              </AdminRow>
            ))}
          </div>
          <span className="text-fg-muted">VAT collected is owed to the state: it comes out of the bank when the return is paid. Sales to other EU countries carry French VAT until the year&apos;s EU sales pass €10,000, then the buyer&apos;s rate (OSS). Due dates and rules to confirm with your accountant.</span>
        </AdminBox>
      )}
      <AdminBox>
        <AdminTitle>Thresholds · {f.period.to.slice(0, 4)}, year to date</AdminTitle>
        <div role="table" aria-label="Thresholds" className="flex flex-col gap-14">
          <AdminHeadRow cols="1fr 200px 70px 160px">
            <span role="columnheader">Threshold</span>
            <span role="columnheader" className="text-right">Used / limit</span>
            <span role="columnheader" className="text-right">Used</span>
            <span role="columnheader">Crossed at this pace</span>
          </AdminHeadRow>
          {f.thresholds.map((t) => (
            <AdminRow key={t.key} cols="1fr 200px 70px 160px">
              <span role="rowheader">{t.label}</span>
              <span role="cell" className="text-right">{eur(t.usedCents)} / {eur(t.limitCents)}</span>
              <span role="cell" className={t.alert ? "text-right text-danger" : "text-right"}>{t.pct}%{t.alert ? " · alert" : ""}</span>
              <span role="cell" className="text-fg-muted">{t.projectedDate ? day(t.projectedDate) : "Not this year"}</span>
            </AdminRow>
          ))}
        </div>
        <span className="text-fg-muted">2026 values; the pace is the last 90 days. An alert shows at 80 %.</span>
      </AdminBox>
    </div>
  );
}

function CashTab({ f }: { f: Finance }) {
  const c = f.cash;
  return (
    <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-12">
      <AdminBox className="md:col-span-5">
        <AdminTitle>Cash · today</AdminTitle>
        <div role="table" aria-label="Cash today" className="flex flex-col gap-14">
          {[
            ["Bank balance", eur(c.bankCents)],
            ["· of which VAT to pay back", eur(c.vatDueCents)],
            ["· of which URSSAF to pay", eur(c.urssafDueCents)],
            ["Really available (bank − VAT − URSSAF)", eur(c.availableCents)],
            ["Stripe balance · waiting (7 days)", eur(c.stripePendingCents)],
            ["Stripe balance · available", eur(c.stripeAvailableCents)],
            ["Next payout", c.nextPayout ? `${eur(c.nextPayout.amountEurCents)} · ${day(c.nextPayout.at)}` : "—"],
            ["Next URSSAF payment", c.nextUrssaf ? `${eur(c.nextUrssaf.totalCents)} · ${c.nextUrssaf.label} · due ${day(c.nextUrssaf.dueDate)}` : "—"],
            ["Next VAT payment", c.nextVat ? `${eur(c.nextVat.amountCents)} · ${c.nextVat.label} · due ${day(c.nextVat.dueDate)}` : "—"],
            ["Gift cards still owed", eur(c.giftCardLiabilityCents)],
          ].map(([k, v]) => (
            <AdminRow key={k} cols="1fr auto">
              <span role="rowheader">{k}</span>
              <span role="cell" className="text-right">{v}</span>
            </AdminRow>
          ))}
        </div>
        <span className="text-fg-muted">Payments land in the Stripe balance net of fees, become available after 7 days and are paid out every Friday.</span>
      </AdminBox>
      <AdminBox className="md:col-span-7">
        <AdminTitle>Payouts</AdminTitle>
        <Payouts f={f} />
      </AdminBox>
    </div>
  );
}

const PAGE = 200;

function LedgerTab({ f, accounts, onClear, onCsv, onFec, exported }: { f: Finance; accounts: LedgerAccount[]; onClear: () => void; onCsv: () => void; onFec: () => void; exported: string | null }) {
  const lines = useMemo(() => ledgerLines(`${f.period.from}..${f.period.to}`, accounts), [f.period.from, f.period.to, accounts]);
  const [all, setAll] = useState(false);
  const shown = all ? lines : lines.slice(0, PAGE);
  const total = lines.reduce((s, l) => s + l.amountEurCents, 0);
  return (
    <AdminBox>
      <div className="flex flex-wrap items-center justify-between gap-12">
        <AdminTitle>Ledger · {f.month}</AdminTitle>
        <div className="flex flex-wrap gap-6">
          <PillButton onClick={onCsv}>{exported === "CSV downloaded" ? "CSV downloaded" : "Export for accountant (CSV)"}</PillButton>
          <PillButton onClick={onFec}>{exported === "FEC downloaded" ? "FEC downloaded" : "FEC file"}</PillButton>
        </div>
      </div>
      <span className="text-fg-muted">
        {lines.length} lines{accounts.length ? ` · ${accounts.join(", ")} · total ${eur(total)}` : ""} · newest first.{" "}
        {accounts.length > 0 && <button type="button" className="cursor-pointer underline" onClick={onClear}>Show every account</button>}
      </span>
      {/* Scrolls sideways on a phone: focusable so the keyboard can scroll it too. */}
      <div role="table" aria-label={`Ledger, ${f.month}`} tabIndex={0} className="flex flex-col gap-14 overflow-x-auto focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg">
        <AdminHeadRow cols="110px 190px 1fr 110px 90px">
          <span role="columnheader">Date</span>
          <span role="columnheader">Account</span>
          <span role="columnheader">Memo · source</span>
          <span role="columnheader" className="text-right">EUR</span>
          <span role="columnheader" className="text-right">USD</span>
        </AdminHeadRow>
        {shown.map((l) => (
          <AdminRow key={l.id} cols="110px 190px 1fr 110px 90px">
            <span role="cell" className="text-fg-muted">{day(l.at)}</span>
            <span role="rowheader">{l.account}</span>
            <span role="cell" className="text-fg-muted">{l.memo} · {l.sourceTable}</span>
            <span role="cell" className="text-right">{eur(l.amountEurCents)}</span>
            <span role="cell" className="text-right text-fg-muted">{l.amountUsdCents === undefined ? "" : formatPrice(l.amountUsdCents)}</span>
          </AdminRow>
        ))}
      </div>
      {!all && lines.length > PAGE && <PillButton onClick={() => setAll(true)}>Show {lines.length - PAGE} more</PillButton>}
    </AdminBox>
  );
}
