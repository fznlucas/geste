"use client";

/**
 * Settings › Payments & tax, Integrations and Simulation (docs/admin-v2/03 §2, 02 §5, 01 §7). Every
 * integration row: name · status (dot + word) · a Live switch (disabled with the reason until a server
 * exists) · Settings (drawer: env vars, webhook, docs, last 20 logs) · Send test event. The board's rows
 * keep their place first; the rest follows, grouped by category. Outbox and Logs below.
 */
import { useState } from "react";
import { AdminHeadRow, AdminRow, AdminTitle, Drawer, Field, Input, PillButton, Select, StatusChip, Switch, useToast } from "@/components";
import { useAdminQuery } from "@/lib/client";
import { clockOverride, simNow } from "@/lib/clock";
import { regenerateSimulation, resetMyActions, sendTestEvent, setGpuBudget, setIntegrationMode, setSimulation, setSimulationClock, setVatRegime } from "@/lib/client/admin/integrations";
import { aiBudget } from "@/lib/api";
import {
  INTEGRATIONS, INTEGRATION_ROWS, PAYMENT_ROWS, businessAssumptions, integrationLogs, outbox, simulationAssumptions, simulationStatus, statusOf, vatRegimeNow, type Integration,
} from "@/lib/metrics";

const ROW = "1fr 190px 120px auto";
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

function IntegrationRow({ i, onSettings }: { i: Integration; onSettings: (i: Integration) => void }) {
  const toast = useToast();
  const s = statusOf(i);
  const run = (fn: () => void, done: string) => {
    try {
      fn();
      toast.show(done);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not change it", { tone: "danger" });
    }
  };
  return (
    <AdminRow cols={ROW}>
      <span role="rowheader" className="flex flex-col">
        <span>{i.name}</span>
        <span className="text-fg-muted">{s.mode === "off" ? i.mock : `In: ${i.inbound} · Out: ${i.outbound}`}</span>
      </span>
      <span role="cell"><StatusChip state={s.state} label={s.label} /></span>
      <span role="cell" className="flex flex-col gap-4">
        <Switch
          label={`Live: ${i.name}`}
          checked={s.mode === "live"}
          disabled={!!s.liveBlocked && s.mode !== "live"}
          onCheckedChange={(on) => run(() => setIntegrationMode(i.id, on ? "live" : "mock"), `${i.name}: ${on ? "Live" : "Mock"}`)}
        />
        {s.liveBlocked && <span className="text-fg-muted">{s.liveBlocked}</span>}
      </span>
      <span role="cell" className="flex flex-wrap gap-6">
        <PillButton onClick={() => onSettings(i)} aria-label={`Settings: ${i.name}`}>Settings</PillButton>
        {s.mode === "off" ? (
          <PillButton onClick={() => run(() => setIntegrationMode(i.id, "mock"), `${i.name}: on (Mock)`)} aria-label={`Turn on: ${i.name}`}>Turn on</PillButton>
        ) : (
          <PillButton onClick={() => run(() => sendTestEvent(i.id), `Test event sent to ${i.name}`)} aria-label={`Send test event: ${i.name}`}>Send test event</PillButton>
        )}
      </span>
    </AdminRow>
  );
}

function SettingsDrawer({ i, onClose }: { i: Integration | null; onClose: () => void }) {
  const toast = useToast();
  const [budget, setBudget] = useState(() => (aiBudget().budgetCents / 100).toFixed(0));
  if (!i) return null;
  const logs = integrationLogs(i.id, 20);
  const s = statusOf(i);
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()} title={i.name}>
      <div className="flex flex-col gap-16 p-20">
        <StatusChip state={s.state} label={s.label} />
        <span className="text-fg-muted">{i.mock}</span>
        {i.id === "modal" && (
          <form
            className="flex items-end gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                setGpuBudget(Math.round(Number(budget) * 100));
                toast.show(`GPU budget: $${budget} a month`);
              } catch (x) {
                toast.show((x as Error).message, { tone: "danger" });
              }
            }}
          >
            <Field label="Monthly GPU budget ($)"><Input type="number" min={0} max={1000} value={budget} onChange={(e) => setBudget(e.target.value)} /></Field>
            <PillButton type="submit">Save budget</PillButton>
          </form>
        )}
        <div className="flex flex-col gap-6">
          <AdminTitle>Live needs</AdminTitle>
          {i.env.length ? i.env.map((k) => <code key={k}>{k}{k.startsWith("NEXT_PUBLIC_") ? "" : " · server only"}</code>) : <span className="text-fg-muted">Nothing: it works in the browser.</span>}
          {i.webhook && <span>Webhook: <code>{i.webhook}</code></span>}
          <a className="underline" href={i.docsUrl} target="_blank" rel="noreferrer">Documentation ↗</a>
        </div>
        <div className="flex flex-col gap-6">
          <AdminTitle>Last {logs.length} events</AdminTitle>
          {logs.length === 0 && <span className="text-fg-muted">Nothing yet.</span>}
          {logs.map((l) => (
            <span key={l.id} className={l.ok ? undefined : "text-danger"}>
              {when(l.at)} · {l.direction === "in" ? "in" : "out"} · {l.operation}{l.detail ? ` · ${l.detail}` : ""}{l.ok ? "" : " · error"}
            </span>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

function Rows({ ids, label }: { ids: string[]; label: string }) {
  const [open, setOpen] = useState<Integration | null>(null);
  return (
    <>
      <div role="table" aria-label={label} className="flex flex-col gap-8">
        <AdminHeadRow cols={ROW}>
          {["Integration", "Status", "Live", "Actions"].map((h) => <span key={h} role="columnheader">{h}</span>)}
        </AdminHeadRow>
        {ids.map((id) => {
          const i = INTEGRATIONS.find((x) => x.id === id)!;
          return <IntegrationRow key={id} i={i} onSettings={setOpen} />;
        })}
      </div>
      <SettingsDrawer i={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** Settings › Payments & tax: the board's four rows, the VAT regime switch and the business rules to confirm. */
export function PaymentsAndTax() {
  const toast = useToast();
  const q = useAdminQuery(async () => ({ regime: vatRegimeNow(), rules: businessAssumptions() }), []);
  if (q.status === "loading") return <div aria-busy="true" aria-label="Loading" className="h-240 bg-surface-muted" />;
  const collect = q.data.regime === "collect";
  return (
    <div className="flex flex-col gap-24">
      <Rows ids={PAYMENT_ROWS} label="Payment providers and tax" />
      <div className="flex flex-col gap-8">
        <AdminTitle>VAT regime</AdminTitle>
        <Switch
          label="Collect VAT (off: franchise en base, “TVA non applicable, art. 293 B du CGI”)"
          checked={collect}
          onCheckedChange={(on) => {
            setVatRegime(on ? "collect" : "franchise");
            toast.show(on ? "VAT collected: prices include VAT" : "Franchise: no VAT line, same prices");
          }}
        />
        <span className="text-fg-muted">{collect ? "Prices include VAT; checkout and invoices show it; VAT returns are due." : "Same prices; no VAT line; invoices say “TVA non applicable, art. 293 B du CGI”; turnover = amount received."} Confirm the regime with your accountant.</span>
      </div>
      <div className="flex flex-col gap-8">
        <AdminTitle>Business rules · to confirm with your accountant</AdminTitle>
        <div role="table" aria-label="Business rules" className="flex flex-col gap-8">
          {q.data.rules.map((r) => (
            <AdminRow key={r.label} cols="1fr 1fr 1.4fr">
              <span role="rowheader">{r.label}</span>
              <span role="cell">{r.value}</span>
              <span role="cell" className="text-fg-muted">{r.source} · confirm</span>
            </AdminRow>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Settings › Integrations: the board's five rows first, then every other integration by category, Outbox and logs. */
export function Integrations() {
  const [view, setView] = useState<"integrations" | "outbox" | "logs">("integrations");
  const [filter, setFilter] = useState("");
  const others = INTEGRATIONS.filter((i) => !INTEGRATION_ROWS.includes(i.id) && !PAYMENT_ROWS.includes(i.id));
  const categories = [...new Set(others.map((i) => i.category))];
  const mail = useAdminQuery(async () => outbox(), []);
  const logs = useAdminQuery(async () => integrationLogs(filter || undefined), [filter]);
  const [openMail, setOpenMail] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-24">
      <div role="group" aria-label="Integrations view" className="flex gap-6">
        <PillButton pressed={view === "integrations"} onClick={() => setView("integrations")}>Integrations</PillButton>
        <PillButton pressed={view === "outbox"} onClick={() => setView("outbox")}>Outbox{mail.status === "ready" && mail.data.length ? ` · ${mail.data.length}` : ""}</PillButton>
        <PillButton pressed={view === "logs"} onClick={() => setView("logs")}>Logs</PillButton>
      </div>
      {view === "integrations" && (
        <>
          <Rows ids={INTEGRATION_ROWS} label="Integrations" />
          {categories.map((c) => (
            <div key={c} className="flex flex-col gap-8">
              <AdminTitle>{c}</AdminTitle>
              <Rows ids={others.filter((i) => i.category === c).map((i) => i.id)} label={`${c} integrations`} />
            </div>
          ))}
        </>
      )}
      {view === "outbox" && (
        <div role="table" aria-label="Outbox" className="flex flex-col gap-8">
          {mail.status === "ready" && mail.data.length === 0 && <span className="text-fg-muted">No email yet: emails the admin sends (receipts, shipping, replies, invites…) are kept here in Mock.</span>}
          {mail.status === "ready" && mail.data.map((m) => (
            <div key={m.id} className="flex flex-col gap-6 border-b border-border py-8">
              <button type="button" className="grid cursor-pointer gap-12 text-left" style={{ gridTemplateColumns: "120px 1fr 1.4fr" }} aria-expanded={openMail === m.id} onClick={() => setOpenMail(openMail === m.id ? null : m.id)}>
                <span className="text-fg-muted">{when(m.at)}</span>
                <span>{m.to}</span>
                <span>{m.subject}</span>
              </button>
              {openMail === m.id && <pre className="whitespace-pre-wrap font-mono text-xs text-fg-muted">From: {m.from}{"\n"}To: {m.to}{"\n\n"}{m.body}</pre>}
            </div>
          ))}
        </div>
      )}
      {view === "logs" && (
        <div className="flex flex-col gap-8">
          <label className="flex max-w-320 flex-col gap-6">
            <span className="text-fg-muted">Integration</span>
            <Select aria-label="Filter logs by integration" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All</option>
              {INTEGRATIONS.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </Select>
          </label>
          <div role="table" aria-label="Integration logs" className="flex flex-col gap-8">
            {logs.status === "ready" && logs.data.map((l) => (
              <AdminRow key={l.id} cols="120px 160px 50px 1fr 70px">
                <span role="cell" className="text-fg-muted">{when(l.at)}</span>
                <span role="rowheader">{l.integration}</span>
                <span role="cell">{l.direction}</span>
                <span role="cell">{l.operation}{l.detail ? ` · ${l.detail}` : ""}</span>
                <span role="cell" className={l.ok ? undefined : "text-danger"}>{l.ok ? "ok" : "error"}</span>
              </AdminRow>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Settings › Simulation (01 §7): seed, clock, hands-off window, reset, assumptions. */
export function Simulation() {
  const toast = useToast();
  const q = useAdminQuery(async () => ({ status: simulationStatus(), assumptions: simulationAssumptions() }), []);
  const [seed, setSeed] = useState("");
  const [hours, setHours] = useState("");
  const [clock, setClock] = useState(() => (clockOverride() ?? simNow().toISOString()).slice(0, 16));
  const [confirmReset, setConfirmReset] = useState(false);
  const fixed = clockOverride();
  if (q.status === "loading") return <div aria-busy="true" aria-label="Loading" className="h-240 bg-surface-muted" />;
  const s = q.data.status;
  const run = (fn: () => void, done: string) => {
    try {
      fn();
      toast.show(done);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not change it", { tone: "danger" });
    }
  };
  return (
    <div className="flex flex-col gap-24">
      <span className="text-fg-muted">Simulated data · generated up to {s.generatedUpTo} · seed “{s.seed}” · {s.orders} orders since launch. Your actions are kept on top of it.</span>
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
        <form className="flex items-end gap-8" onSubmit={(e) => { e.preventDefault(); run(() => setSimulation({ seed }), `Seed “${seed.trim()}”: another history`); }}>
          <Field label="Seed"><Input value={seed} placeholder={s.seed} onChange={(e) => setSeed(e.target.value)} /></Field>
          <PillButton type="submit">Use seed</PillButton>
          <PillButton onClick={() => run(() => { const n = regenerateSimulation(); setSeed(n); }, "Regenerated: a new history")}>Regenerate</PillButton>
        </form>
        <form className="flex items-end gap-8" onSubmit={(e) => { e.preventDefault(); run(() => setSimulation({ handsOffHours: Number(hours) }), `Hands-off window: ${hours} h`); }}>
          <Field label="Hands-off hours"><Input type="number" min={0} max={240} value={hours} placeholder={String(s.handsOffHours)} onChange={(e) => setHours(e.target.value)} /></Field>
          <PillButton type="submit">Save</PillButton>
        </form>
        <form className="flex flex-wrap items-end gap-8" onSubmit={(e) => { e.preventDefault(); run(() => setSimulationClock(new Date(`${clock}:00Z`).toISOString()), `Clock fixed at ${clock.replace("T", " ")} UTC for this tab`); }}>
          <Field label="Clock (UTC)"><Input type="datetime-local" value={clock} onChange={(e) => setClock(e.target.value)} /></Field>
          <PillButton type="submit">Fix the clock</PillButton>
          {fixed && <PillButton onClick={() => run(() => setSimulationClock(null), "Clock back to real time")}>Real time</PillButton>}
        </form>
        <div className="flex flex-col gap-6">
          <span>Reset my actions</span>
          <span className="text-fg-muted">Forgets every change made in this admin and every purchase made in this browser. You stay signed in.</span>
          <PillButton onClick={() => {
            if (!confirmReset) return setConfirmReset(true);
            run(resetMyActions, "Your actions and purchases are forgotten");
            setConfirmReset(false);
          }}>{confirmReset ? "Click again to reset" : "Reset my actions"}</PillButton>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <AdminTitle>Assumptions (src/sim/config.ts)</AdminTitle>
        <div role="table" aria-label="Simulation assumptions" className="flex flex-col gap-8">
          {q.data.assumptions.map((a) => (
            <AdminRow key={a.label} cols="1fr 1fr 1fr">
              <span role="rowheader">{a.label}</span>
              <span role="cell">{a.value}</span>
              <span role="cell" className="text-fg-muted">{a.source}</span>
            </AdminRow>
          ))}
        </div>
      </div>
    </div>
  );
}
