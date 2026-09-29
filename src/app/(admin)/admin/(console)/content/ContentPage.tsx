"use client";

/**
 * /admin/content (AdminContent): Journal (published articles with views, drafts; "New article" starts a
 * draft), Home page (hero work + headline, "Publish home"), French translation progress, legal versions.
 * Owner and Content. The store is built at deploy time: in the mock, a published home shows here only.
 */
import { useId, useState } from "react";
import Link from "next/link";
import { AdminHeadRow, AdminRow, AdminTabs, AdminTitle, Button, ButtonLink, Input, Select, StatusChip, useToast } from "@/components";
import { articleDate, getAdminArticles, getHomeSettings, getLegalDocs, getTranslationProgress, type HomeSettings } from "@/lib/api";
import { useAdminQuery } from "@/lib/client";
import { createArticleDraft, publishHome } from "@/lib/client/admin/content";
import { AdminPage } from "../../_admin/AdminPage";

type Tab = "Journal" | "Home page" | "Translations" | "Legal pages";
const TABS: Tab[] = ["Journal", "Home page", "Translations", "Legal pages"];
const JOURNAL_COLS = "1.6fr 110px 110px 90px 150px";

export function ContentPage() {
  const [tab, setTab] = useState<Tab>("Journal");
  const toast = useToast();
  const newArticle = async () => {
    try {
      await createArticleDraft();
      setTab("Journal");
      toast.show("Draft created · Untitled article");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not create the draft.", { tone: "danger" });
    }
  };
  const body = (
    <>
      <div className="flex justify-between">
        <AdminTabs label="Content" tabs={TABS} value={tab} onChange={setTab} />
      </div>
      {tab === "Journal" && <Journal />}
      {tab === "Home page" && <HomePanel />}
      {tab === "Translations" && <Translations />}
      {tab === "Legal pages" && <Legal />}
    </>
  );
  return (
    <AdminPage
      title="Content"
      breadcrumbs={[{ label: "Growth", href: "/admin/analytics" }]}
      roles={["content"]}
      desktopHref="/admin/content"
      actions={<Button size="sm" trailing="+" onClick={newArticle} className="min-h-36 min-w-150">New article</Button>}
      phone={
        <>
          <h1 className="text-admin-title font-medium tracking-heading">Content</h1>
          {/* No phone board: the desktop tables, scrolled sideways. */}
          <div className="overflow-x-auto"><div className="flex min-w-720 flex-col gap-24">{body}</div></div>
        </>
      }
    >
      {body}
    </AdminPage>
  );
}

function Journal() {
  const articles = useAdminQuery(getAdminArticles, []);
  return (
    <div role="table" aria-label="Journal" className="flex flex-col gap-14 border border-border bg-surface px-20 pb-20">
      <AdminHeadRow cols={JOURNAL_COLS}>
        <span role="columnheader">Article</span>
        <span role="columnheader">Category</span>
        <span role="columnheader">Date</span>
        <span role="columnheader">Views</span>
        <span role="columnheader">Status</span>
      </AdminHeadRow>
      {articles.status === "loading"
        ? [0, 1, 2, 3].map((i) => <div key={i} aria-hidden="true" className="my-12 h-20 bg-surface-muted" />)
        : articles.data.map((a) => {
            const cells = (
              <>
                <span role="cell">
                  {/* A link cannot be a table row (axe): the title link is stretched over the row. */}
                  {a.href ? <Link href={a.href} className="after:absolute after:inset-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-fg">{a.title}</Link> : a.title}
                </span>
                <span role="cell">{a.category}</span>
                <span role="cell" className="text-fg-muted">{a.publishedAt ? articleDate(a.publishedAt) : "—"}</span>
                <span role="cell" className="tabular-nums">{a.views === null ? "—" : a.views.toLocaleString("en-US")}</span>
                <span role="cell"><StatusChip state={a.status === "published" ? "done" : "todo"} label={a.status === "published" ? "Published" : "Draft"} /></span>
              </>
            );
            return (
              <AdminRow key={a.id} cols={JOURNAL_COLS} className={a.href ? "relative hover:bg-surface-hover" : undefined}>{cells}</AdminRow>
            );
          })}
    </div>
  );
}

function HomePanel() {
  const settings = useAdminQuery(getHomeSettings, []);
  if (settings.status === "loading") return <div aria-busy="true" className="min-h-200 border border-border bg-surface" />;
  return <HomeForm settings={settings.data} />;
}

function HomeForm({ settings }: { settings: HomeSettings }) {
  const heroId = useId();
  const headlineId = useId();
  const toast = useToast();
  const [hero, setHero] = useState(settings.heroWork);
  const [headline, setHeadline] = useState(settings.headline);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const publish = async () => {
    setBusy(true);
    try {
      await publishHome({ heroWork: hero, headline });
      setPublished(true);
      setError(null);
      toast.show("Home published");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish the home page.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="flex flex-col gap-14 border border-border bg-surface p-20"
      onSubmit={(e) => {
        e.preventDefault();
        publish();
      }}
    >
      <AdminTitle>Home page</AdminTitle>
      <div className="grid grid-cols-2 gap-14">
        <div>
          {/* mb-7: the board's native select sits 1 px below the text field (as in docs/decisions.md "Checkout (M3)"). */}
          <label htmlFor={heroId} className="mb-7 block text-fg-muted">Hero work</label>
          <Select id={heroId} value={hero} onChange={(e) => { setHero(e.target.value); setPublished(false); }}>
            {settings.options.map((o) => <option key={o.slug} value={o.slug}>{o.number}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor={headlineId} className="mb-6 block text-fg-muted">Headline</label>
          <Input
            id={headlineId}
            value={headline}
            invalid={!!error}
            aria-describedby={error ? `${headlineId}-err` : undefined}
            onChange={(e) => { setHeadline(e.target.value); setPublished(false); }}
          />
          {error && <p id={`${headlineId}-err`} role="alert" className="mt-6 text-danger">{error}</p>}
        </div>
      </div>
      <div className="flex gap-10">
        <ButtonLink href="/" variant="ghost" target="_blank" rel="noreferrer">Preview ↗</ButtonLink>
        <Button type="submit" trailing="→" loading={busy} className="min-w-200">{published ? "Published" : "Publish home"}</Button>
      </div>
      <p className="text-fg-muted">The demo store is built ahead of time: a new hero shows here, not on the store.</p>
    </form>
  );
}

function Translations() {
  const rows = useAdminQuery(getTranslationProgress, []);
  const cols = "1fr 120px 1fr";
  return (
    <div role="table" aria-label="French translation" className="flex flex-col gap-14 border border-border bg-surface px-20 pb-20">
      <AdminHeadRow cols={cols}>
        <span role="columnheader">Area</span>
        <span role="columnheader">FR done</span>
        <span role="columnheader">Progress</span>
      </AdminHeadRow>
      {(rows.data ?? []).map((r) => (
        <AdminRow key={r.area} cols={cols}>
          <span role="cell">{r.area}</span>
          <span role="cell" className="tabular-nums">{r.frDonePct}%</span>
          <span role="cell" className="relative h-8 bg-surface-muted" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 rounded-r-bar bg-fg" style={{ width: `${r.frDonePct}%` }} />
          </span>
        </AdminRow>
      ))}
    </div>
  );
}

function Legal() {
  const docs = useAdminQuery(getLegalDocs, []);
  const cols = "1fr 140px 160px";
  return (
    <div role="table" aria-label="Legal pages" className="flex flex-col gap-14 border border-border bg-surface p-20">
      {(docs.data ?? []).map((d) => (
        <AdminRow key={d.id} cols={cols}>
          <span role="cell">
            {/* The store page of the document (drawn as plain text; kept looking like it until hovered). */}
            <Link href={`/legal/${d.slug}`} className="hover:underline hover:underline-offset-3">{d.title}</Link>
          </span>
          <span role="cell" className="text-fg-muted">v{d.version} · {articleDate(d.updatedAt)}</span>
          <span role="cell">
            <StatusChip state={d.status === "blocked" ? "issue" : d.status === "live" ? "done" : "todo"} label={d.note ?? (d.status === "live" ? "Live" : "Draft")} />
          </span>
        </AdminRow>
      ))}
    </div>
  );
}
