"use client";

/**
 * /admin/marketing (AdminMarketing), owner only. Tabs: Promo codes (list + "New promo code" →
 * createPromo), Gift cards (mock + bought at checkout in this browser), Newsletter (October draft:
 * subject/body saved on blur, "Send a test", "Schedule for Tuesday"), Affiliate, Social calendar.
 * Mock: nothing is emailed; codes, drafts and schedules live in the admin overlay and the audit log.
 */
import { useState } from "react";
import {
  AdminBox, AdminHeadRow, AdminRow, AdminTabs, AdminTitle, Button, Field, Input, Select, StatusChip, Textarea, useToast,
} from "@/components";
import { getAffiliates, getCampaigns, getGiftCards, getPromoCodes, getSocialWeek, type Campaign, type PromoScope } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import {
  PROMO_DISCOUNTS, PROMO_SCOPES, PromoError, createPromo, saveCampaign, scheduleCampaign, sendTest, unscheduleCampaign, type PromoDiscount,
} from "@/lib/client/admin/marketing";
import { formatPrice } from "@/lib/format";
import { AdminPage } from "../../_admin/AdminPage";

const TABS = ["Promo codes", "Gift cards", "Newsletter", "Affiliate", "Social calendar"] as const;
type Tab = (typeof TABS)[number];

export function MarketingPage() {
  const [tab, setTab] = useState<Tab>("Promo codes");
  return (
    <AdminPage title="Marketing" breadcrumbs={[{ label: "Growth", href: "/admin/analytics" }]} roles={["owner"]} desktopHref="/admin/marketing">
      <div className="flex justify-between overflow-x-auto">
        <AdminTabs label="Marketing" tabs={TABS} value={tab} onChange={setTab} className="whitespace-nowrap" />
      </div>
      {tab === "Promo codes" && <Promos />}
      {tab === "Gift cards" && <GiftCards />}
      {tab === "Newsletter" && <Newsletter />}
      {tab === "Affiliate" && <Affiliate />}
      {tab === "Social calendar" && <Social />}
    </AdminPage>
  );
}

const Loading = () => <div aria-busy="true" aria-label="Loading" className="h-320 bg-surface-muted" />;

/** Box holding a table: no top padding, the header row sits on the box edge (board: padding 0 20 20). */
function TableBox({ label, cols, head, children, className }: { label: string; cols: string; head: string[]; children: React.ReactNode; className?: string }) {
  return (
    // Scrolls sideways on phones: focusable so the keyboard can scroll it too.
    <AdminBox className={`overflow-x-auto pt-0 ${className ?? ""}`} tabIndex={0} role="region" aria-label={label}>
      <div role="table" aria-label={label} className="flex min-w-560 flex-col gap-14">
        <AdminHeadRow cols={cols}>
          {head.map((h) => (
            <span key={h} role="columnheader">{h}</span>
          ))}
        </AdminHeadRow>
        {children}
      </div>
    </AdminBox>
  );
}

// ── Promo codes ──────────────────────────────────────────────────────────────

const PROMO_COLS = "140px 1fr 1fr 80px 110px";

function Promos() {
  const q = useAdminQuery(getPromoCodes, []);
  const toast = useToast();
  const [code, setCode] = useState("OCTOBER15");
  const [discount, setDiscount] = useState<PromoDiscount>("−10%");
  const [scope, setScope] = useState<PromoScope>("guides");
  const [maxUses, setMaxUses] = useState("200");
  const [endsOn, setEndsOn] = useState("2026-10-31");
  const [err, setErr] = useState<Partial<Record<PromoError["field"], string>>>({});
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const created = await createPromo({ code, discount, scope, maxUses, endsOn });
      setErr({});
      setCode("");
      toast.show(`Code ${created} created`);
    } catch (e) {
      if (e instanceof PromoError) setErr({ [e.field]: e.message });
      else toast.show((e as Error).message, { tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-12">
      <TableBox label="Promo codes" cols={PROMO_COLS} head={["Code", "Discount", "Where", "Uses", "Status"]} className="md:col-span-8">
        {q.status === "loading" ? (
          <div className="h-135 bg-surface-muted" aria-busy="true" />
        ) : (
          q.data.map((p) => (
            <AdminRow key={p.id} cols={PROMO_COLS}>
              <span role="rowheader" className="font-medium">{p.code}</span>
              <span role="cell">{p.discount}</span>
              <span role="cell" className="text-fg-muted">{p.where}</span>
              <span role="cell">{p.maxUses === null ? p.uses : `${p.uses}/${p.maxUses}`}</span>
              <span role="cell">{p.status}</span>
            </AdminRow>
          ))
        )}
      </TableBox>
      <AdminBox as="form" className="md:col-span-4" onSubmit={(e: React.FormEvent) => (e.preventDefault(), create())} noValidate aria-label="New promo code">
        <AdminTitle>New promo code</AdminTitle>
        <Field label="Code" error={err.code}>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} />
        </Field>
        <div className="grid grid-cols-2 gap-10">
          <Field label="Discount">
            <Select value={discount} onChange={(e) => setDiscount(e.target.value as PromoDiscount)}>
              {PROMO_DISCOUNTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="On">
            <Select value={scope} onChange={(e) => setScope(e.target.value as PromoScope)}>
              {PROMO_SCOPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <Field label="Max uses" error={err.maxUses}>
            <Input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="Ends" error={err.endsAt}>
            <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" trailing="+" loading={busy}>Create code</Button>
      </AdminBox>
    </div>
  );
}

// ── Gift cards ───────────────────────────────────────────────────────────────

const GIFT_COLS = "180px 1fr 100px 100px 120px";

function GiftCards() {
  const q = useAdminQuery(getGiftCards, []);
  if (q.status === "loading") return <Loading />;
  return (
    <TableBox label="Gift cards" cols={GIFT_COLS} head={["Card", "From → to", "Amount", "Balance", "Status"]}>
      {q.data.map((g) => (
        <AdminRow key={g.id} cols={GIFT_COLS}>
          <span role="rowheader">{g.code}</span>
          <span role="cell">{g.fromTo}</span>
          <span role="cell">{formatPrice(g.amountCents)}</span>
          <span role="cell">{formatPrice(g.balanceCents)}</span>
          <span role="cell"><StatusChip state={g.state} label={g.status} /></span>
        </AdminRow>
      ))}
    </TableBox>
  );
}

// ── Newsletter ───────────────────────────────────────────────────────────────

function Newsletter() {
  const q = useAdminQuery(getCampaigns, []);
  if (q.status === "loading") return <Loading />;
  const { draft, past, audiences } = q.data;
  return (
    <div className="grid grid-cols-1 items-start gap-16 md:grid-cols-12">
      {draft ? <Draft key={draft.id} draft={draft} audiences={audiences} /> : <AdminBox className="md:col-span-7"><p className="text-fg-muted">No draft. The next letter starts here.</p></AdminBox>}
      <AdminBox className="md:col-span-5">
        <AdminTitle>Past letters</AdminTitle>
        <div role="table" aria-label="Past letters: open rate and click rate" className="flex flex-col gap-14">
          {past.map((c) => (
            <AdminRow key={c.id} cols="1fr 60px 60px">
              <span role="rowheader">{c.label}</span>
              <span role="cell">{c.openRate}%</span>
              <span role="cell">{c.clickRate}%</span>
            </AdminRow>
          ))}
        </div>
        <span className="text-fg-muted">Open rate · click rate</span>
      </AdminBox>
    </div>
  );
}

function Draft({ draft, audiences }: { draft: Campaign; audiences: Array<{ key: Campaign["audience"]; label: string; count: number }> }) {
  const toast = useToast();
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [subjectErr, setSubjectErr] = useState<string>();
  const audience = audiences.find((a) => a.key === draft.audience) ?? audiences[0]!;
  const audienceLabel = (a: (typeof audiences)[number]) => `${a.label} · ${a.count.toLocaleString("en-US")}`;
  const month = draft.label.split(" · ")[0];
  const check = () => {
    if (!subject.trim()) {
      setSubjectErr("Enter a subject");
      return false;
    }
    setSubjectErr(undefined);
    return true;
  };
  return (
    <AdminBox className="md:col-span-7">
      <AdminTitle>{month} letter · {draft.scheduledAt ? "scheduled" : "draft"}</AdminTitle>
      <Field label="Subject" error={subjectErr}>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={() => check() && subject !== draft.subject && saveCampaign(draft.id, { subject: subject.trim() })} />
      </Field>
      <Field label="Body">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => body !== draft.body && saveCampaign(draft.id, { bodyMd: body })} className="mb-6 min-h-160" />
      </Field>
      <div className="flex flex-wrap gap-10">
        <div className="min-w-200 flex-1">
          <label htmlFor="nl-audience" className="sr-only">Audience</label>
          {/* 48 px like the buttons beside it; the board's inline textarea leaves 6 px above the row (mb-6). */}
          <Select id="nl-audience" className="h-48" value={draft.audience} onChange={(e) => saveCampaign(draft.id, { audience: e.target.value as Campaign["audience"] })}>
            {audiences.map((a) => (
              <option key={a.key} value={a.key}>{audienceLabel(a)}</option>
            ))}
          </Select>
        </div>
        <Button
          variant="ghost"
          className="min-w-150"
          onClick={() => {
            if (!check()) return;
            sendTest(draft.id, subject, body);
            toast.show("Test sent to you · in the Outbox");
          }}
        >
          {draft.testSentAt ? "Test sent to you" : "Send a test"}
        </Button>
        <Button
          trailing="→"
          className="min-w-200"
          aria-pressed={!!draft.scheduledAt}
          onClick={() => {
            if (draft.scheduledAt) {
              unscheduleCampaign(draft.id, subject);
              toast.show("Sending cancelled");
            } else if (check()) {
              scheduleCampaign(draft.id, subject, audienceLabel(audience));
              toast.show("Scheduled for Tuesday 9:00");
            }
          }}
        >
          {draft.scheduledAt ? "Scheduled · Tue 9:00" : "Schedule for Tuesday"}
        </Button>
      </div>
      {/* Counted from the subscriber rows: not every subscriber has bought. */}
      <span className="text-fg-muted">
        {audiences.find((a) => a.key === "all")!.count.toLocaleString("en-US")} subscribers · {audiences.find((a) => a.key === "buyers")!.count.toLocaleString("en-US")} are customers
      </span>
    </AdminBox>
  );
}

// ── Affiliate ────────────────────────────────────────────────────────────────

const AFF_COLS = "1fr 100px 100px 100px 100px";

function Affiliate() {
  const q = useAdminQuery(getAffiliates, []);
  if (q.status === "loading") return <Loading />;
  return (
    <AdminBox className="overflow-x-auto pt-0" tabIndex={0} role="region" aria-label="Affiliate">
      <div role="table" aria-label="Affiliate partners" className="flex min-w-560 flex-col gap-14">
        <AdminHeadRow cols={AFF_COLS}>
          {["Partner", "Clicks", "Sales", "Rate", "Earned"].map((h) => (
            <span key={h} role="columnheader">{h}</span>
          ))}
        </AdminHeadRow>
        {q.data.map((a) => (
          <AdminRow key={a.id} cols={AFF_COLS}>
            <span role="rowheader">{a.partner}</span>
            <span role="cell">{a.clicks.toLocaleString("en-US")}</span>
            <span role="cell">{a.sales}</span>
            <span role="cell">{a.ratePct}%</span>
            <span role="cell">{formatPrice(a.earnedCents)}</span>
          </AdminRow>
        ))}
      </div>
      <span className="text-fg-muted">Partners are placeholders: sign up to real affiliate programmes first.</span>
    </AdminBox>
  );
}

// ── Social calendar ──────────────────────────────────────────────────────────

function Social() {
  const q = useAdminQuery(getSocialWeek, []);
  if (q.status === "loading") return <Loading />;
  return (
    <ol aria-label="Social calendar, week of Oct 5" className="grid grid-cols-2 gap-10 md:grid-cols-7">
      {q.data.map((d) => (
        // A day: white box, 12 px padding, 180 px of content at least (content-box, as drawn).
        <li key={d.day} className="box-content flex min-h-180 flex-col gap-14 border border-border bg-surface p-12">
          <span className="text-fg-muted">{d.day}</span>
          {d.posts.map((p) => (
            <span key={p} className="bg-surface-muted px-8 py-6">{p}</span>
          ))}
        </li>
      ))}
    </ol>
  );
}
