"use client";

/**
 * /admin/marketing (AdminMarketing), owner only. Tabs: Promo codes (list + "New promo code" →
 * createPromo), Gift cards (mock + bought at checkout in this browser), Newsletter (October draft:
 * subject/body saved on blur, "Send a test", "Schedule for Tuesday"), Affiliate, Social calendar.
 * Mock: nothing is emailed; codes, drafts and schedules live in the admin overlay and the audit log.
 */
import { useState } from "react";
import {
  AdminBox, AdminHeadRow, AdminRow, AdminTabs, AdminTitle, Button, Field, Input, Modal, PillButton, Select, StatusChip, Textarea, useToast,
} from "@/components";
import { getAffiliates, getCampaigns, getGiftCards, getPromoCodes, getSocialWeek, type AffiliatePartner, type Campaign, type PromoScope, type SocialPost } from "@/lib/api";
import { addDays } from "@/lib/clock";
import { useAdminQuery } from "@/lib/client";
import {
  PROMO_DISCOUNTS, PROMO_SCOPES, PromoError, addSocialPost, createPromo, deleteSocialPost, extendGiftCard, moveSocialPost, resendGiftCard, saveCampaign, savePartner, scheduleCampaign, sendTest, unscheduleCampaign, voidGiftCard, type PromoDiscount,
} from "@/lib/client/admin/marketing";
import { formatPrice } from "@/lib/format";
import { AdminPage } from "../../_admin/AdminPage";
import { useTabParam } from "../../_admin/useTabParam";

const TABS = ["Promo codes", "Gift cards", "Newsletter", "Affiliate", "Social calendar"] as const;

export function MarketingPage() {
  const [tab, setTab] = useTabParam(TABS, "Promo codes");
  return (
    <AdminPage title="Marketing" subtitle="Promo codes, gift cards, newsletter, affiliate partners and the social calendar" breadcrumbs={[{ label: "Growth", href: "/admin/analytics" }]} roles={["owner"]} desktopHref="/admin/marketing">
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
  const [startsOn, setStartsOn] = useState("");
  const [firstOrder, setFirstOrder] = useState(false);
  const [err, setErr] = useState<Partial<Record<PromoError["field"], string>>>({});
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const created = await createPromo({ code, discount, scope, maxUses, endsOn, startsOn, firstOrderOnly: firstOrder });
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
        <Field label="Starts" hint="Empty: today">
          <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </Field>
        <label className="flex cursor-pointer items-center gap-8">
          <input type="checkbox" checked={firstOrder} onChange={(e) => setFirstOrder(e.target.checked)} className="accent-fg" />
          <span>First order only</span>
        </label>
        <span className="text-fg-muted">Never applies to a gift card.</span>
        <Button type="submit" trailing="+" loading={busy}>Create code</Button>
      </AdminBox>
    </div>
  );
}

// ── Gift cards ───────────────────────────────────────────────────────────────

const GIFT_COLS = "170px 1fr 80px 80px 110px 100px 210px";

function GiftCards() {
  const q = useAdminQuery(getGiftCards, []);
  const toast = useToast();
  const run = (fn: () => Promise<unknown>, ok: string) => fn().then(() => toast.show(ok), (e) => toast.show(e instanceof Error ? e.message : "Could not change the card.", { tone: "danger" }));
  if (q.status === "loading") return <Loading />;
  return (
    <TableBox label="Gift cards" cols={GIFT_COLS} head={["Card", "From → to", "Amount", "Balance", "Status", "Valid until", "Actions"]}>
      {q.data.map((g) => (
        <AdminRow key={g.id} cols={GIFT_COLS}>
          <span role="rowheader">{g.code}</span>
          <span role="cell">{g.fromTo}</span>
          <span role="cell">{formatPrice(g.amountCents)}</span>
          <span role="cell">{formatPrice(g.balanceCents)}</span>
          <span role="cell"><StatusChip state={g.state} label={g.status} /></span>
          <span role="cell" className="text-fg-muted">{g.voided ? "—" : g.expiresAt.slice(0, 10)}</span>
          <span role="cell" className="flex gap-6">
            {g.orderNumber && <PillButton aria-label={`Send ${g.code} again`} onClick={() => run(() => resendGiftCard(g.id), `${g.code} sent again · in the Outbox`)}>Resend</PillButton>}
            {!g.voided && <PillButton aria-label={`Extend ${g.code} by a year`} onClick={() => run(() => extendGiftCard(g.id), `${g.code} extended by a year`)}>Extend</PillButton>}
            {!g.voided && g.balanceCents > 0 && <PillButton aria-label={`Cancel ${g.code}`} onClick={() => run(() => voidGiftCard(g.id), `${g.code} cancelled`)}>Cancel</PillButton>}
          </span>
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
              {/* Sent today: the rates come in after the first day. */}
              <span role="cell">{c.openRate === null ? "—" : `${c.openRate}%`}</span>
              <span role="cell">{c.clickRate === null ? "—" : `${c.clickRate}%`}</span>
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

const AFF_COLS = "1fr 90px 80px 70px 110px 70px";

/** Affiliate partners, last 30 days from the affiliate rows; each partner can be edited. */
function Affiliate() {
  const q = useAdminQuery(getAffiliates, []);
  const [editing, setEditing] = useState<AffiliatePartner | null>(null);
  if (q.status === "loading") return <Loading />;
  return (
    <AdminBox className="overflow-x-auto pt-0" tabIndex={0} role="region" aria-label="Affiliate">
      <div role="table" aria-label="Affiliate partners" className="flex min-w-560 flex-col gap-14">
        <AdminHeadRow cols={AFF_COLS}>
          {["Partner", "Clicks", "Sales", "Rate", "Earned · 30 d", ""].map((h) => (
            <span key={h} role="columnheader">{h}</span>
          ))}
        </AdminHeadRow>
        {q.data.map((a) => (
          <AdminRow key={a.id} cols={AFF_COLS}>
            <span role="rowheader">{a.partner}</span>
            <span role="cell" className="tabular-nums">{a.clicks.toLocaleString("en-US")}</span>
            <span role="cell" className="tabular-nums">{a.sales}</span>
            <span role="cell">{a.ratePct}%</span>
            <span role="cell" className="tabular-nums">{formatPrice(a.earnedEurCents, "en", "EUR")}</span>
            <span role="cell"><PillButton aria-label={`Edit ${a.partner}`} onClick={() => setEditing(a)}>Edit</PillButton></span>
          </AdminRow>
        ))}
      </div>
      <span className="text-fg-muted">Last 30 days. Partners are placeholders: sign up to real affiliate programmes first.</span>
      {editing && <PartnerForm p={editing} onClose={() => setEditing(null)} />}
    </AdminBox>
  );
}

function PartnerForm({ p, onClose }: { p: AffiliatePartner; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ partner: p.partner, ratePct: String(p.ratePct), linkTemplate: p.linkTemplate, payoutDay: String(p.payoutDay) });
  const [error, setError] = useState<string | null>(null);
  const save = () => {
    try {
      savePartner(p.id, { partner: f.partner, ratePct: Number(f.ratePct), linkTemplate: f.linkTemplate, payoutDay: Number(f.payoutDay) });
      toast.show(`${f.partner} saved`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };
  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={`Edit ${p.partner}`} width={460} placement="admin" actions={<><Button variant="ghost" className="grow" onClick={onClose}>Cancel</Button><Button className="grow-2" trailing="→" onClick={save}>Save</Button></>}>
      <Field label="Name"><Input value={f.partner} onChange={(e) => setF({ ...f, partner: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-10">
        <Field label="Rate (%)"><Input inputMode="decimal" value={f.ratePct} onChange={(e) => setF({ ...f, ratePct: e.target.value })} /></Field>
        <Field label="Payout day"><Input inputMode="numeric" value={f.payoutDay} onChange={(e) => setF({ ...f, payoutDay: e.target.value })} /></Field>
      </div>
      <Field label="Link template" hint="{url} = the product's address"><Input value={f.linkTemplate} onChange={(e) => setF({ ...f, linkTemplate: e.target.value })} /></Field>
      {error && <p role="alert" className="text-danger">{error}</p>}
    </Modal>
  );
}

// ── Social calendar ──────────────────────────────────────────────────────────

const NETWORK_LABEL: Record<SocialPost["network"], string> = { tiktok: "TikTok", instagram: "Instagram", pinterest: "Pinterest", youtube: "YouTube" };

/** The week's posts (social rows and those planned here), week by week; planned posts move or go. */
function Social() {
  const [monday, setMonday] = useState<string | undefined>(undefined);
  const q = useAdminQuery(() => getSocialWeek(monday), [monday]);
  const toast = useToast();
  const [adding, setAdding] = useState<string | null>(null);
  if (q.status === "loading") return <Loading />;
  const w = q.data;
  const fail = (e: unknown) => toast.show(e instanceof Error ? e.message : "Could not change the calendar.", { tone: "danger" });
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center gap-8">
        <PillButton aria-label="Previous week" onClick={() => setMonday(addDays(w.monday, -7))}>←</PillButton>
        <span>Week of {w.days[0]!.label}</span>
        <PillButton aria-label="Next week" onClick={() => setMonday(addDays(w.monday, 7))}>→</PillButton>
      </div>
      <ol aria-label={`Social calendar, week of ${w.days[0]!.label}`} className="grid grid-cols-2 gap-10 md:grid-cols-7">
        {w.days.map((d, i) => (
          // A day: white box, 12 px padding, 180 px of content at least (content-box, as drawn).
          <li key={d.day} className="box-content flex min-h-180 flex-col gap-14 border border-border bg-surface p-12">
            <span className="text-fg-muted">{d.label}</span>
            {d.posts.map((p) => (
              <span key={p.id} className="flex flex-col gap-4 bg-surface-muted px-8 py-6">
                <span>{NETWORK_LABEL[p.network]} · {p.title}</span>
                {p.views !== null && <span className="text-fg-muted">{p.views.toLocaleString("en-US")} views · {p.linkClicks} clicks</span>}
                {p.editable && (
                  <span className="flex gap-4">
                    {i > 0 && <PillButton aria-label={`Move “${p.title}” a day earlier`} onClick={() => { try { moveSocialPost(p.id, p.title, addDays(d.day, -1)); } catch (e) { fail(e); } }}>←</PillButton>}
                    {i < 6 && <PillButton aria-label={`Move “${p.title}” a day later`} onClick={() => { try { moveSocialPost(p.id, p.title, addDays(d.day, 1)); } catch (e) { fail(e); } }}>→</PillButton>}
                    <PillButton aria-label={`Remove “${p.title}”`} onClick={() => { try { deleteSocialPost(p.id, p.title); } catch (e) { fail(e); } }}>✕</PillButton>
                  </span>
                )}
              </span>
            ))}
            {adding === d.day ? (
              <NewPost day={d.day} onDone={() => setAdding(null)} fail={fail} />
            ) : (
              <PillButton className="mt-auto self-start" aria-label={`Plan a post on ${d.label}`} onClick={() => setAdding(d.day)}>+ Post</PillButton>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function NewPost({ day, onDone, fail }: { day: string; onDone: () => void; fail: (e: unknown) => void }) {
  const [network, setNetwork] = useState<SocialPost["network"]>("tiktok");
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          addSocialPost(day, network, title);
          onDone();
        } catch (err) {
          fail(err);
        }
      }}
    >
      <label className="sr-only" htmlFor={`np-n-${day}`}>Network</label>
      <Select id={`np-n-${day}`} value={network} onChange={(e) => setNetwork(e.target.value as SocialPost["network"])}>
        {Object.entries(NETWORK_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      <label className="sr-only" htmlFor={`np-t-${day}`}>Title</label>
      <Input id={`np-t-${day}`} value={title} placeholder="Title" onChange={(e) => setTitle(e.target.value)} />
      <span className="flex gap-4">
        <PillButton type="submit">Add</PillButton>
        <PillButton onClick={onDone}>Cancel</PillButton>
      </span>
    </form>
  );
}
