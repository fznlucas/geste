"use client";

/**
 * /admin/settings (AdminSettings), owner only. Tabs: Store (fields saved when left: saveSetting),
 * Shipping, Payments & tax, Team & roles (inviteStaff / removeStaff + PermissionMatrix), Security
 * (with the audit log: this browser's admin actions, newest first, then the log before them),
 * Integrations (Mock / Live per integration, Outbox, logs), Simulation. Payments & tax and Integrations
 * keep the board's rows first (docs/admin-v2/03 §2). The tab is in the URL (`?tab=Simulation`).
 */
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  AdminBox, AdminHeadRow, AdminRow, AdminTabs, AdminTitle, Button, Field, Input, PermissionMatrix, Select, StatusChip, useToast,
} from "@/components";
import {
  getPastAudit, getSecuritySettings, getShippingZones, getStoreSettings, getTeam,
  type SettingStatus, type StoreSetting,
} from "@/lib/api";
import { useAdminQuery, useAudit } from "@/lib/client";
import { inviteStaff, removeStaff, saveSetting } from "@/lib/client/admin/settings";
import type { StaffRole } from "@/lib/types";
import { AdminPage } from "../../_admin/AdminPage";
import { Integrations, PaymentsAndTax, Simulation } from "./IntegrationsSettings";

const TABS = ["Store", "Shipping", "Payments & tax", "Team & roles", "Security", "Integrations", "Simulation"] as const;
type Tab = (typeof TABS)[number];

const CHIP: Record<SettingStatus, "done" | "todo" | "off"> = { on: "done", todo: "todo", off: "off" };

export function SettingsPage() {
  const asked = useSearchParams().get("tab");
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t === asked) ?? "Store");
  return (
    <AdminPage title="Settings & team" breadcrumbs={[{ label: "Studio", href: "/admin/settings" }]} roles={["owner"]} desktopHref="/admin/settings">
      <AdminBox>
        <div className="overflow-x-auto">
          <AdminTabs label="Settings" tabs={TABS} value={tab} onChange={setTab} className="whitespace-nowrap" />
        </div>
        <div className="flex flex-col gap-8">
          {tab === "Store" && <Store />}
          {tab === "Shipping" && <Shipping />}
          {tab === "Payments & tax" && <PaymentsAndTax />}
          {tab === "Team & roles" && <Team />}
          {tab === "Security" && <Security />}
          {tab === "Integrations" && <Integrations />}
          {tab === "Simulation" && <Simulation />}
        </div>
      </AdminBox>
    </AdminPage>
  );
}

const Loading = () => <div aria-busy="true" aria-label="Loading" className="h-240 bg-surface-muted" />;

// ── Store ────────────────────────────────────────────────────────────────────

function Store() {
  const q = useAdminQuery(getStoreSettings, []);
  if (q.status === "loading") return <Loading />;
  return (
    <div className="grid grid-cols-1 gap-14 md:grid-cols-2">
      {q.data.map((s) => (
        <StoreField key={s.key} setting={s} />
      ))}
    </div>
  );
}

function StoreField({ setting }: { setting: StoreSetting }) {
  const toast = useToast();
  const [value, setValue] = useState(setting.value);
  const [err, setErr] = useState<string>();
  return (
    <Field label={setting.label} error={err}>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const v = value.trim();
          if (v === setting.value) return;
          if (!v) {
            setErr(`Enter the ${setting.label.toLowerCase()}`);
            return;
          }
          setErr(undefined);
          saveSetting(setting.key, setting.label, v);
          toast.show(`Saved · ${setting.label}`);
        }}
      />
    </Field>
  );
}

// ── Shipping ─────────────────────────────────────────────────────────────────

const SHIP_COLS = "1fr 1.4fr 90px 120px";

function Shipping() {
  const q = useAdminQuery(getShippingZones, []);
  if (q.status === "loading") return <Loading />;
  return (
    <div role="table" aria-label="Shipping zones" className="flex flex-col gap-8">
      <AdminHeadRow cols={SHIP_COLS}>
        {["Zone", "Carriers", "From", "Status"].map((h) => (
          <span key={h} role="columnheader">{h}</span>
        ))}
      </AdminHeadRow>
      {q.data.map((z) => (
        <AdminRow key={z.zone} cols={SHIP_COLS}>
          <span role="rowheader">{z.zone}</span>
          <span role="cell" className="text-fg-muted">{z.carriers}</span>
          <span role="cell">{z.from}</span>
          <span role="cell"><StatusChip state={CHIP[z.state]} label={z.status} /></span>
        </AdminRow>
      ))}
    </div>
  );
}

// ── Team & roles ─────────────────────────────────────────────────────────────

const TEAM_COLS = "1.2fr 140px 120px 100px";
const INVITE_ROLES: Array<[Exclude<StaffRole, "owner">, string]> = [
  ["support", "Support"],
  ["fulfilment", "Fulfilment"],
  ["content", "Content editor"],
];

function Team() {
  const q = useAdminQuery(getTeam, []);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<StaffRole, "owner">>("support");
  const [err, setErr] = useState<string>();
  if (q.status === "loading") return <Loading />;

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteStaff(email, role);
      setErr(undefined);
      toast.show(`Invite sent to ${email.trim().toLowerCase()}`);
      setEmail("");
    } catch (x) {
      setErr((x as Error).message);
    }
  };

  return (
    <>
      <div role="table" aria-label="Team" className="flex flex-col gap-8">
        <AdminHeadRow cols={TEAM_COLS}>
          <span role="columnheader">Member</span>
          <span role="columnheader">Role</span>
          <span role="columnheader">2FA</span>
          <span role="columnheader"><span className="sr-only">Actions</span></span>
        </AdminHeadRow>
        {q.data.map((m) => (
          <AdminRow key={m.id} cols={TEAM_COLS}>
            <span role="rowheader">{m.who}</span>
            <span role="cell">{m.roleLabel}</span>
            <span role="cell">{m.invited ? <StatusChip state="todo" label="Invite sent" /> : <StatusChip state={m.totpEnabled ? "done" : "todo"} label={m.totpEnabled ? "On" : "Off"} />}</span>
            <span role="cell">
              {m.invited && (
                <button
                  type="button"
                  onClick={() => {
                    removeStaff(m.id, m.email);
                    toast.show(`${m.email} removed`);
                  }}
                  aria-label={`Remove ${m.email}`}
                  className="inline-flex min-h-32 cursor-pointer items-center underline underline-offset-3 hover:text-fg-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg"
                >
                  Remove
                </button>
              )}
            </span>
          </AdminRow>
        ))}
      </div>
      <form onSubmit={invite} noValidate className="flex flex-col gap-6" aria-label="Invite a team member">
        <div className="flex flex-wrap gap-10">
          <div className="min-w-200 flex-1">
            <label htmlFor="tm-mail" className="sr-only">Email</label>
            <Input
              id="tm-mail"
              type="email"
              placeholder="freelance@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={!!err}
              aria-invalid={!!err || undefined}
              aria-describedby={err ? "tm-mail-err" : undefined}
            />
          </div>
          <div className="w-180">
            <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Exclude<StaffRole, "owner">)}>
              {INVITE_ROLES.map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" trailing="+" className="min-w-150">Invite</Button>
        </div>
        {err && <p id="tm-mail-err" role="alert" className="text-danger">{err}</p>}
      </form>
      <AdminTitle as="h3" className="mt-12">Permissions by role</AdminTitle>
      <PermissionMatrix />
      <span className="text-fg-muted">Only the Owner sees revenue, payouts and can refund above $50.</span>
    </>
  );
}

// ── Security ─────────────────────────────────────────────────────────────────

/** "Oct 2 10:31" (UTC, three-letter month as on the admin boards). */
const auditTime = (iso: string) => {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0"), mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()} ${hh}:${mm}`;
};

function Security() {
  const q = useAdminQuery(async () => ({ settings: await getSecuritySettings(), past: await getPastAudit() }), []);
  const mine = useAudit();
  if (q.status === "loading") return <Loading />;
  const log = [...mine.map((a) => ({ id: a.id, at: a.at, summary: a.summary })), ...q.data.past];
  return (
    <>
      <div role="table" aria-label="Security" className="flex flex-col gap-8">
        {q.data.settings.map((s) => (
          <AdminRow key={s.name} cols="1fr 200px">
            <span role="rowheader">{s.name}</span>
            <span role="cell"><StatusChip state="done" label={s.status} /></span>
          </AdminRow>
        ))}
      </div>
      <AdminTitle as="h3" className="mt-12">Audit log</AdminTitle>
      <div role="table" aria-label="Audit log, newest first" className="flex flex-col gap-8">
        {log.map((a) => (
          <AdminRow key={a.id} cols="140px 1fr">
            <span role="cell" className="text-fg-muted"><time dateTime={a.at}>{auditTime(a.at)}</time></span>
            <span role="cell">{a.summary}</span>
          </AdminRow>
        ))}
      </div>
    </>
  );
}
