"use client";

/**
 * /admin/analytics (AdminAnalytics), owner only: funnel, sources, N°03 completion by step with the two
 * drop-offs in Signal, devices, level mix, repeat rate. Mock: the board's figures (`getAnalytics`);
 * later the PostHog query API. The range tabs change the funnel and the sources.
 */
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminBox, AdminTabs, AdminTitle, HBar, Select, UnderLink } from "@/components";
import { formatPrice } from "@/lib/format";
import { ANALYTICS_RANGES, analytics, type Analytics, type AnalyticsRange, SMALL_SAMPLE_READERS } from "@/lib/metrics";
import { useAdminQuery } from "@/lib/client";
import { AdminPage } from "../../_admin/AdminPage";

const RANGE_PARAM: Record<string, AnalyticsRange> = { "7": "7 days", "30": "30 days", "90": "90 days", year: "Year" };
const PARAM_OF: Record<AnalyticsRange, string> = { "7 days": "7", "30 days": "30", "90 days": "90", Year: "year" };

export function AnalyticsPage() {
  // ?range=7|30|90|year and ?work=N°05 in the URL (the dashboard's tiles open a range and a block: #funnel, #basket, #completion).
  const params = useSearchParams();
  const router = useRouter();
  const range = RANGE_PARAM[params.get("range") ?? ""] ?? "30 days";
  const work = params.get("work") ?? "N°03";
  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) next.set(k, v);
    router.replace(`/admin/analytics/?${next}`, { scroll: false });
  };
  const setRange = (r: AnalyticsRange) => set({ range: PARAM_OF[r] });
  const q = useAdminQuery(() => analytics(range, work), [range, work]);
  useEffect(() => {
    if (q.status === "ready" && window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [q.status]);
  return (
    <AdminPage title="Analytics" subtitle={`Last ${range.toLowerCase()} · store and reader · all devices`} breadcrumbs={[{ label: "Growth", href: "/admin/analytics" }]} roles={["owner"]} desktopHref="/admin/analytics">
      <div className="flex flex-wrap justify-between gap-12">
        <AdminTabs label="Range" tabs={ANALYTICS_RANGES} value={range} onChange={setRange} className="whitespace-nowrap" />
        <span className="text-fg-muted">Store + app · all devices</span>
      </div>
      {q.status === "loading" ? <Skeleton /> : <Boards a={q.data} onWork={(w) => set({ work: w })} />}
    </AdminPage>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="grid grid-cols-1 gap-16 md:grid-cols-12">
      {[6, 6, 12, 4, 4, 4].map((span, i) => (
        <div key={i} className="h-220 bg-surface-muted" style={{ gridColumn: `span ${span}` }} />
      ))}
    </div>
  );
}

const pctLabel = (n: number) => `${n}%`;

function Boards({ a, onWork }: { a: Analytics; onWork: (work: string) => void }) {
  const span = (n: 4 | 6 | 12) => (n === 12 ? "md:col-span-12" : n === 6 ? "md:col-span-6" : "md:col-span-4");
  return (
    <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
      <AdminBox id="funnel" className={`${span(6)} scroll-mt-16`}>
        <AdminTitle>Funnel · last {a.range.toLowerCase()}</AdminTitle>
        <HBar label="Funnel" rows={a.funnel} />
        <span className="text-fg-muted">
          Biggest leak: {a.leak.from} → {a.leak.to} ({a.leak.pct}%). Test the sticky bar and real-result photos.
        </span>
      </AdminBox>
      <AdminBox className={span(6)}>
        <AdminTitle>Where buyers come from</AdminTitle>
        <HBar label="Orders by source" rows={a.sources.map((s) => ({ label: s.label, value: s.orders, display: `${s.orders} orders` }))} />
      </AdminBox>
      <AdminBox id="completion" className={`${span(12)} scroll-mt-16`}>
        <Completion a={a} onWork={onWork} />
      </AdminBox>
      <AdminBox className={span(4)}>
        <AdminTitle>Devices</AdminTitle>
        <HBar label="Devices" rows={a.devices.map((d) => ({ label: d.label, value: d.pct, display: pctLabel(d.pct) }))} />
      </AdminBox>
      <AdminBox className={span(4)}>
        <AdminTitle>Level mix sold</AdminTitle>
        <HBar label="Level mix sold" rows={a.levelMix.map((d) => ({ label: d.label, value: d.pct, display: pctLabel(d.pct) }))} />
      </AdminBox>
      <AdminBox className={span(4)}>
        <AdminTitle>Repeat purchase</AdminTitle>
        <span className="text-lg">{a.repeat.pct}%</span>
        <span className="text-fg-muted">{a.repeat.context}</span>
      </AdminBox>
      <AdminBox id="basket" className={`${span(12)} scroll-mt-16`}>
        <AdminTitle>Average order · last {a.range.toLowerCase()}</AdminTitle>
        <span className="text-lg tabular-nums">{formatPrice(a.basket.avgOrderCents, "en", "EUR")} <span className="text-xs text-fg-muted">excl. VAT</span></span>
        <span className="text-fg-muted">{a.basket.orders} paid orders · {a.basket.linesPerOrder} lines per order · {a.basket.withPrintPct}% with a print</span>
      </AdminBox>
    </div>
  );
}

/**
 * 15 columns, one per step, 180 px + the Ink baseline. The bar is 85 % of the column at 100 % so the labels (first, drops, last)
 * fit above it. The two drops are Signal bars with their label; the sentence under the chart says why.
 */
function Completion({ a, onWork }: { a: Analytics; onWork: (work: string) => void }) {
  const steps = a.completion.steps;
  const drops = steps.filter((s) => s.drop);
  const labelled = (i: number) => i === 0 || i === steps.length - 1 || !!steps[i]!.drop;
  return (
    <>
      <div className="flex flex-wrap justify-between gap-x-12">
        <AdminTitle>Guide completion · {a.completion.workNumber} · % of buyers reaching each step</AdminTitle>
        <span className="flex items-center gap-8 text-fg-muted">
          <label htmlFor="an-work">Work</label>
          <Select id="an-work" value={a.completion.workNumber} onChange={(e) => onWork(e.target.value)} className="w-100">
            {a.works.map((w) => <option key={w}>{w}</option>)}
          </Select>
        </span>
      </div>
      <div aria-hidden="true" className="flex h-181 items-end gap-6 border-b border-fg">
        {steps.map((s, i) => (
          <div key={s.step} className="flex h-full flex-1 flex-col items-center justify-end gap-4">
            <span className={s.drop ? "text-danger" : "text-fg-muted"}>{labelled(i) ? `${s.pct}%` : ""}</span>
            <span className={`block w-full rounded-t-bar ${s.drop ? "bg-danger" : "bg-fg"}`} style={{ height: `${Math.floor(s.pct * 0.85)}%` }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="grid grid-cols-15 text-center text-fg-muted">
        {steps.map((s) => (
          <span key={s.step}>{s.step.endsWith("a") ? s.step : s.step.slice(1)}</span>
        ))}
      </div>
      {/* In a clipped box: a sr-only table still lays out at its content width (page scroll on phones). */}
      <div className="sr-only">
        <table>
          <caption>Guide completion, {a.completion.workNumber}: share of buyers reaching each step</caption>
          <tbody>
            {steps.map((s) => (
              <tr key={s.step}>
                <th scope="row">Step {s.step}</th>
                <td>{s.pct}%{s.drop ? `, drop of ${s.drop.points} points` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {drops.length ? (
        <span>
          <span className="text-danger">Drops at {drops.map((d) => `${d.step} (−${d.drop!.points} pts)`).join(" and ")}</span>{" "}
          <span className="text-fg-muted">
            · {drops.map((d) => d.drop!.reason).join("; ")}.{" "}
            {a.completion.editHref && <UnderLink href={a.completion.editHref} className="text-fg">Edit these steps</UnderLink>}
          </span>
        </span>
      ) : (
        <span className="text-fg-muted">Where people stop is where the guide needs work: no drop for {a.completion.workNumber} yet.</span>
      )}
      {a.completion.readers < SMALL_SAMPLE_READERS && <span className="text-fg-muted">Small sample ({a.completion.readers} readers)</span>}
    </>
  );
}
