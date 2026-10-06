"use client";

/**
 * /admin/analytics (AdminAnalytics), owner only: funnel, sources, N°03 completion by step with the two
 * drop-offs in Signal, devices, level mix, repeat rate. Mock: the board's figures (`getAnalytics`);
 * later the PostHog query API. The range tabs change the funnel and the sources.
 */
import { useState } from "react";
import { AdminBox, AdminTabs, AdminTitle, GUIDE_EDITOR_HREF, HBar, UnderLink } from "@/components";
import { ANALYTICS_RANGES, analytics, type Analytics, type AnalyticsRange } from "@/lib/metrics";
import { useAdminQuery } from "@/lib/client";
import { AdminPage } from "../../_admin/AdminPage";

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("30 days");
  const q = useAdminQuery(() => analytics(range), [range]);
  return (
    <AdminPage title="Analytics" breadcrumbs={[{ label: "Growth", href: "/admin/analytics" }]} roles={["owner"]} desktopHref="/admin/analytics">
      <div className="flex flex-wrap justify-between gap-12">
        <AdminTabs label="Range" tabs={ANALYTICS_RANGES} value={range} onChange={setRange} className="whitespace-nowrap" />
        <span className="text-fg-muted">Store + app · all devices</span>
      </div>
      {q.status === "loading" ? <Skeleton /> : <Boards a={q.data} />}
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

function Boards({ a }: { a: Analytics }) {
  const span = (n: 4 | 6 | 12) => (n === 12 ? "md:col-span-12" : n === 6 ? "md:col-span-6" : "md:col-span-4");
  return (
    <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
      <AdminBox className={span(6)}>
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
      <AdminBox className={span(12)}>
        <Completion a={a} />
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
    </div>
  );
}

/**
 * 15 columns, one per step, 180 px + the Ink baseline. The bar is 85 % of the column at 100 % so the labels (first, drops, last)
 * fit above it. The two drops are Signal bars with their label; the sentence under the chart says why.
 */
function Completion({ a }: { a: Analytics }) {
  const steps = a.completion.steps;
  const drops = steps.filter((s) => s.drop);
  const labelled = (i: number) => i === 0 || i === steps.length - 1 || !!steps[i]!.drop;
  return (
    <>
      <div className="flex flex-wrap justify-between gap-x-12">
        <AdminTitle>Guide completion · {a.completion.workNumber} · % of buyers reaching each step</AdminTitle>
        <span className="text-fg-muted">Where people stop is where the guide needs work</span>
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
      <span>
        <span className="text-danger">Drops at {drops.map((d) => `${d.step} (−${d.drop!.points} pts)`).join(" and ")}</span>{" "}
        <span className="text-fg-muted">
          · {drops.map((d) => d.drop!.reason).join("; ")}. <UnderLink href={GUIDE_EDITOR_HREF} className="text-fg">Edit these steps</UnderLink>
        </span>
      </span>
    </>
  );
}
